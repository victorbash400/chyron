import { useCallback, useEffect, useRef, useState } from "react";
export function useAudioCapture(onError: (error: string) => void) {
  const [opening, setOpening] = useState(false);
  const [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    media = useRef<MediaStream | null>(null);
  const limit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true),
    abort = useRef<AbortController | null>(null);
  const stopTracks = useCallback(() => {
    media.current?.getTracks().forEach((track) => track.stop());
    media.current = null;
    clearTimeout(limit.current);
  }, []);
  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    setRecording(false);
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
      if (recorder.current?.state === "recording") recorder.current.stop();
      stopTracks();
    };
  }, [stopTracks]);
  const start = async (source: "microphone" | "tab") => {
    setBusy(true);
    setOpening(true);
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder)
        throw new Error(
          "Audio capture is unavailable in this browser. Use Chrome.",
        );
      const stream =
        source === "microphone"
          ? await navigator.mediaDevices.getUserMedia({ audio: true })
          : await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      media.current = stream;
      if (!stream.getAudioTracks().length)
        throw new Error("Select a browser tab and enable Share tab audio.");
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      if (!mimeType)
        throw new Error("Audio recording format is unsupported. Use Chrome.");
      const capture = new MediaRecorder(
        new MediaStream(stream.getAudioTracks()),
        { mimeType },
      );
      recorder.current = capture;
      const chunks: BlobPart[] = [];
      let size = 0,
        invalid = false;
      capture.ondataavailable = (event) => {
        size += event.data.size;
        if (size > 4000000) {
          invalid = true;
          stop();
          onError("Recording exceeds 4 MB. Record a shorter clip.");
        } else if (event.data.size) chunks.push(event.data);
      };
      capture.onerror = () => {
        invalid = true;
        stop();
        stopTracks();
        if (mounted.current) {
          setRecording(false);
          setBusy(false);
          onError("Audio recording failed. Record again.");
        }
      };
      capture.onstop = () => {
        stopTracks();
        if (!mounted.current) return;
        setRecording(false);
        if (invalid) {
          setBusy(false);
          return;
        }
        setBusy(true);
        const controller = new AbortController();
        abort.current = controller;
        void fetch("/api/audio", {
          method: "POST",
          headers: { "Content-Type": mimeType.split(";")[0] },
          body: new Blob(chunks, { type: mimeType }),
          signal: controller.signal,
        })
          .then(async (response) => {
            const result = await response.json();
            if (!response.ok)
              throw new Error(result.error ?? "Audio transcription failed.");
          })
          .catch((error) => {
            if (mounted.current) onError(error.message);
          })
          .finally(() => {
            if (mounted.current) setBusy(false);
          });
      };
      stream
        .getTracks()
        .forEach((track) =>
          track.addEventListener("ended", stop, { once: true }),
        );
      capture.start();
      setRecording(true);
      limit.current = setTimeout(stop, 55000);
    } catch (error) {
      stopTracks();
      onError(error instanceof Error ? error.message : "Audio capture failed.");
    } finally {
      if (mounted.current) {
        setBusy(false);
        setOpening(false);
      }
    }
  };
  return { recording, busy, opening, start, stop };
}
