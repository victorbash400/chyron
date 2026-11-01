import type { TranscriptResult } from "../../shared/audio.ts";
interface AudioClip {
  blob: Blob;
  mimeType: string;
  sourceId: string;
}
export class AudioUploads {
  private clips: AudioClip[] = [];
  private processing = false;
  private active = true;
  private controller = new AbortController();
  constructor(
    private onPending: (count: number) => void,
    private onResult: (result: TranscriptResult) => void,
    private onError: (message: string) => void,
    private request = fetch,
  ) {}
  enqueue(blob: Blob, mimeType: string, sourceId: string) {
    if (!this.active) return;
    if (this.clips.length + Number(this.processing) >= 4) {
      this.onError(
        "Transcription is falling behind. Stop capture and try again.",
      );
      return;
    }
    this.clips.push({ blob, mimeType, sourceId });
    this.onPending(this.clips.length + Number(this.processing));
    void this.flush();
  }
  dispose() {
    this.active = false;
    this.clips = [];
    this.controller.abort();
  }
  private async flush() {
    if (this.processing) return;
    this.processing = true;
    while (this.active && this.clips.length) {
      const clip = this.clips.shift()!;
      try {
        const request = this.request;
        const response = await request("/api/audio", {
          method: "POST",
          headers: {
            "Content-Type": clip.mimeType.split(";")[0]!,
            "X-Chyron-Source": clip.sourceId,
          },
          body: clip.blob,
          signal: this.controller.signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? "Audio transcription failed.");
        if (
          typeof result.transcript !== "string" ||
          !["speech", "silence", "uncertain"].includes(result.status) ||
          (result.status !== "speech" && result.transcript !== "")
        )
          throw new Error("Invalid transcription response. Try again.");
        if (this.active) this.onResult(result as TranscriptResult);
      } catch (error) {
        if (this.active) {
          this.clips = [];
          this.onError(
            error instanceof Error
              ? error.message
              : "Audio transcription failed.",
          );
        }
      }
      if (this.active) this.onPending(this.clips.length);
    }
    this.processing = false;
  }
}
