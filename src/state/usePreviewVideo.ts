import { useEffect, useRef, useState } from "react";
export function usePreviewVideo(onError: (error: string) => void) {
  const [stream, setStream] = useState<MediaStream | null>(null),
    [opening, setOpening] = useState(false);
  const active = useRef<MediaStream | null>(null),
    mounted = useRef(true);
  function stop() {
    active.current?.getTracks().forEach((track) => track.stop());
    active.current = null;
    if (mounted.current) setStream(null);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  async function start(source: "camera" | "screen") {
    setOpening(true);
    try {
      if (!navigator.mediaDevices)
        throw new Error("Video capture is unavailable in this browser.");
      const next =
        source === "camera"
          ? await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
              audio: false,
            })
          : await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            });
      if (!mounted.current) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      if (!next.getVideoTracks().length) {
        next.getTracks().forEach((track) => track.stop());
        throw new Error("Select a video source.");
      }
      stop();
      active.current = next;
      setStream(next);
      next.getVideoTracks()[0].addEventListener("ended", stop, { once: true });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not open video.");
    } finally {
      if (mounted.current) setOpening(false);
    }
  }
  return { stream, opening, start, stop };
}
