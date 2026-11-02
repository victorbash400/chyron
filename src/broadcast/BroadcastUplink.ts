import type {
  BroadcastEvent,
  BroadcastStatus,
  BroadcastTicket,
} from "../../shared/broadcast.ts";
export class BroadcastUplink {
  private socket: WebSocket | undefined;
  private recorder: MediaRecorder | undefined;
  private ending = false;
  private finished = false;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  constructor(
    private onStatus: (status: BroadcastStatus) => void,
    private onError: (message: string) => void,
    private onEnd: () => void,
  ) {}
  connect(ticket: BroadcastTicket, stream: MediaStream) {
    this.onStatus("connecting");
    const socket = new WebSocket(ticket.url, [`chyron.${ticket.token}`]);
    this.socket = socket;
    this.timeout = setTimeout(
      () => this.fail("Broadcast connection timed out. Try again."),
      20000,
    );
    socket.onmessage = (event) => {
      if (this.finished) return;
      try {
        const message = JSON.parse(event.data) as BroadcastEvent;
        if (message.type === "ready") {
          clearTimeout(this.timeout);
          const options: MediaRecorderOptions & {
            videoKeyFrameIntervalDuration: number;
          } = {
            mimeType: "video/webm;codecs=vp8,opus",
            videoBitsPerSecond: 3500000,
            audioBitsPerSecond: 128000,
            videoKeyFrameIntervalDuration: 2000,
          };
          const recorder = new MediaRecorder(stream, options);
          this.recorder = recorder;
          recorder.ondataavailable = (event) => {
            if (!event.data.size || this.finished) return;
            if (
              socket.readyState !== WebSocket.OPEN ||
              socket.bufferedAmount + event.data.size > 1000000
            ) {
              this.fail("Upload is too slow. Broadcast stopped.");
              return;
            }
            socket.send(event.data);
          };
          recorder.onerror = () =>
            this.fail("Video encoding failed. Start again.");
          recorder.onstop = () => {
            if (!this.finished && socket.readyState === WebSocket.OPEN)
              socket.send(JSON.stringify({ type: "stop" }));
          };
          recorder.start(250);
          this.timeout = setTimeout(
            () => this.fail("Twitch connection timed out. Start again."),
            45000,
          );
        } else if (message.type === "live") {
          clearTimeout(this.timeout);
          if (!this.ending) this.onStatus("live");
        } else if (message.type === "error") this.fail(message.message);
        else if (message.type === "ended") this.dispose();
        else this.fail("Invalid broadcast response.");
      } catch {
        this.fail("Invalid broadcast response.");
      }
    };
    socket.onerror = () => this.fail("Broadcast connection failed. Try again.");
    socket.onclose = () => {
      if (!this.finished) {
        if (!this.ending) this.onError("Broadcast disconnected. Start again.");
        this.dispose();
      }
    };
  }
  stop() {
    if (this.ending || this.finished) return;
    this.ending = true;
    clearTimeout(this.timeout);
    this.onStatus("stopping");
    if (this.recorder?.state === "recording") {
      this.recorder.stop();
      this.timeout = setTimeout(() => this.dispose(), 10000);
    } else this.dispose();
  }
  dispose() {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(this.timeout);
    if (this.recorder?.state === "recording") this.recorder.stop();
    this.socket?.close();
    this.onStatus("idle");
    this.onEnd();
  }
  private fail(message: string) {
    if (!this.finished) {
      this.onError(message);
      this.dispose();
    }
  }
}
