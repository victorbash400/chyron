import { useEffect, useRef } from "react";
import "./PreviewVideo.css";
export default function PreviewVideo({ stream }: { stream: MediaStream }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current!;
    element.srcObject = stream;
    return () => {
      element.srcObject = null;
    };
  }, [stream]);
  return (
    <video
      className="preview-video"
      ref={video}
      autoPlay
      playsInline
      muted
      aria-label="Selected preview video"
    />
  );
}
