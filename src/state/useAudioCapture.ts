import { useCallback, useEffect, useRef, useState } from "react";
import { AudioUploads } from "./audioUploads.ts";
export function useAudioCapture(
  sourceId: string,
  onError: (error: string) => void,
  disabled = false,
) {
  const [opening, setOpening] = useState(false),
    [recording, setRecording] = useState(false),
    [pending, setPending] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null),
    media = useRef<MediaStream | null>(null);
  const segment = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const discardFinal = useRef(false);
  const mounted = useRef(true),
    repeat = useRef(false),
    uploads = useRef<AudioUploads | null>(null);
  const errorHandler = useRef(onError);
  errorHandler.current = onError;
  const stopTracks = useCallback(() => {
    media.current?.getTracks().forEach((track) => track.stop());
    media.current = null;
    clearTimeout(segment.current);
  }, []);
  const stop = useCallback(() => {
    repeat.current = false;
    clearTimeout(segment.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    else stopTracks();
    if (mounted.current) setRecording(false);
  }, [stopTracks]);
  useEffect(() => {
    mounted.current = true;
    generation.current++;
    setRecording(false);
    setOpening(false);
    setPending(0);
    setTranscript(null);
    uploads.current = new AudioUploads(
      setPending,
      (result) =>
        setTranscript(
          result.status === "speech"
            ? result.transcript
            : result.status === "uncertain"
              ? "Speech unclear."
              : null,
        ),
      (message) => {
        discardFinal.current = true;
        stop();
        errorHandler.current(message);
      },
    );
    return () => {
      mounted.current = false;
      repeat.current = false;
      uploads.current?.dispose();
      if (recorder.current?.state === "recording") recorder.current.stop();
      stopTracks();
    };
  }, [sourceId, disabled, stop, stopTracks]);
  async function start(source: "microphone" | "tab" | MediaStream) {
    if (disabled || opening || recording || pending) return;
    const current = generation.current;
    discardFinal.current = false;
    setOpening(true);
    setTranscript(null);
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder)
        throw new Error("Audio capture is unavailable. Use Chrome.");
      const stream =
        typeof source !== "string"
          ? new MediaStream(
              source.getAudioTracks().map((track) => track.clone()),
            )
          : source === "microphone"
            ? await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
              })
            : await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
              });
      if (!mounted.current || current !== generation.current) {
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
      repeat.current = true;
      const begin = () => {
        if (
          !mounted.current ||
          current !== generation.current ||
          !media.current
        )
          return;
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
            errorHandler.current(
              "Recording exceeds 4 MB. Record a shorter clip.",
            );
          } else if (event.data.size) chunks.push(event.data);
        };
        capture.onerror = () => {
          invalid = true;
          stop();
          stopTracks();
          errorHandler.current("Audio recording failed. Record again.");
        };
        capture.onstop = () => {
          clearTimeout(segment.current);
          if (!mounted.current || current !== generation.current) return;
          if (!invalid && !discardFinal.current && size)
            uploads.current?.enqueue(
              new Blob(chunks, { type: mimeType }),
              mimeType,
              sourceId,
            );
          if (repeat.current && !invalid) begin();
          else {
            stopTracks();
            setRecording(false);
          }
        };
        capture.start();
        setRecording(true);
        segment.current = setTimeout(() => {
          if (capture.state === "recording") {
            capture.stop();
          }
        }, 6000);
      };
      stream
        .getTracks()
        .forEach((track) =>
          track.addEventListener("ended", stop, { once: true }),
        );
      begin();
    } catch (error) {
      stopTracks();
      errorHandler.current(
        error instanceof Error ? error.message : "Audio capture failed.",
      );
    } finally {
      if (mounted.current && current === generation.current) setOpening(false);
    }
  }
  return { recording, pending, opening, transcript, start, stop };
}
