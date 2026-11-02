import { useEffect, useRef, useState } from "react";
import type { NewsroomState } from "../../shared/types.ts";
import { useAudioCapture } from "./useAudioCapture.ts";

export function useVoiceSummaries(
  state: NewsroomState | undefined,
  stream: MediaStream | null,
  act: (path: string, body?: unknown) => Promise<boolean>,
  onError: (message: string) => void,
) {
  const [source, setSource] = useState<"microphone" | "tab">("microphone");
  const [stopped, setStopped] = useState(false);
  const [requested, setRequested] = useState(false);
  const disabled =
    stopped || !state || state.paused || !state.coverage.includeAudio;
  const capture = useAudioCapture(
    state?.sourceId ?? "",
    (message) => {
      setStopped(true);
      setRequested(false);
      onError(message);
    },
    disabled,
    stream ?? source,
  );
  const current = useRef(capture);
  current.current = capture;
  useEffect(() => {
    if (!disabled && (stream || requested))
      void current.current.start(stream ?? source);
    return () => current.current.stop(true);
  }, [stream, state?.sourceId, disabled, requested, source]);

  async function start() {
    setStopped(false);
    setRequested(true);
    if (
      (!state?.coverage.includeAudio || state.paused) &&
      !(await act("/api/settings", {
        paused: false,
        coverage: { includeAudio: true },
      }))
    )
      setRequested(false);
  }
  async function stop() {
    setStopped(true);
    setRequested(false);
    capture.stop(true);
    await act("/api/settings", { coverage: { includeAudio: false } });
  }
  return {
    ...capture,
    source,
    setSource,
    start,
    stop,
    active: !disabled && capture.recording,
    broadcast: Boolean(stream),
  };
}
