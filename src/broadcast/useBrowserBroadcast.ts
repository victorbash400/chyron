import { useEffect, useRef, useState } from "react";
import type {
  BroadcastStatus,
  BroadcastTicket,
} from "../../shared/broadcast.ts";
import { api } from "../state/api.ts";
import { capturePreview } from "./capturePreview.ts";
import { mixAudio } from "./mixAudio.ts";
import { BroadcastUplink } from "./BroadcastUplink.ts";
export function useBrowserBroadcast(
  onError: (message: string) => void,
  onAudio: (stream: MediaStream | null) => void,
) {
  const [status, setStatus] = useState<BroadcastStatus>("idle");
  const uplink = useRef<BroadcastUplink | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const dispose = () => {
    generation.current++;
    uplink.current?.dispose();
    uplink.current = null;
    cleanup.current?.();
    cleanup.current = null;
  };
  useEffect(() => () => dispose(), []);
  useEffect(() => {
    if (status === "idle") return;
    const preventClose = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventClose);
    return () => window.removeEventListener("beforeunload", preventClose);
  }, [status]);
  async function start(
    element: HTMLElement,
    source: MediaStream,
    microphone: boolean,
    test: boolean,
  ) {
    if (status !== "idle") return;
    const current = ++generation.current;
    setStatus("preparing");
    let capture: MediaStream | undefined;
    let sourceEnded: (() => void) | undefined;
    let audio: Awaited<ReturnType<typeof mixAudio>> | undefined;
    const release = () => {
      onAudio(null);
      if (sourceEnded)
        source.getVideoTracks()[0]?.removeEventListener("ended", sourceEnded);
      capture?.getTracks().forEach((track) => track.stop());
      audio?.close();
    };
    try {
      capture = await capturePreview(element);
      if (current !== generation.current) {
        release();
        return;
      }
      audio = await mixAudio(source, microphone);
      if (current !== generation.current) {
        release();
        return;
      }
      cleanup.current = release;
      const ticket = await api<BroadcastTicket>("/api/broadcast/start", {
        test,
      });
      if (current !== generation.current) {
        release();
        return;
      }
      if (
        source.getVideoTracks()[0]?.readyState !== "live" ||
        capture.getVideoTracks()[0]?.readyState !== "live"
      )
        throw new Error("Video source stopped. Select a source and try again.");
      const connection = new BroadcastUplink(
        (value) => {
          setStatus(value);
          if (value === "live" && audio?.hasInput && !test)
            onAudio(new MediaStream([audio.track]));
        },
        onError,
        () => {
          release();
          cleanup.current = null;
          uplink.current = null;
        },
      );
      uplink.current = connection;
      sourceEnded = () => connection.stop();
      capture
        .getVideoTracks()[0]
        .addEventListener("ended", sourceEnded, { once: true });
      source
        .getVideoTracks()[0]
        .addEventListener("ended", sourceEnded, { once: true });
      connection.connect(
        ticket,
        new MediaStream([...capture.getVideoTracks(), audio.track]),
      );
    } catch (error) {
      release();
      if (current === generation.current) {
        setStatus("idle");
        onError(
          error instanceof Error
            ? error.message
            : "Broadcast failed. Try again.",
        );
      }
    }
  }
  return {
    status,
    start,
    stop: () => {
      if (uplink.current) uplink.current.stop();
      else {
        dispose();
        setStatus("idle");
      }
    },
  };
}
