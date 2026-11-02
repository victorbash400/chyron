import { useEffect, useRef } from "react";
import { useAudioCapture } from "../state/useAudioCapture.ts";
export function useBroadcastAudio(
  stream: MediaStream | null,
  sourceId: string,
  disabled: boolean,
  onError: (message: string) => void,
) {
  const capture = useAudioCapture(sourceId, onError, disabled);
  const current = useRef(capture);
  current.current = capture;
  useEffect(() => {
    if (stream && !disabled) void current.current.start(stream);
    return () => current.current.stop();
  }, [stream, sourceId, disabled]);
}
