import { useState } from "react";
import { Mic, Monitor, Square, LoaderCircle } from "lucide-react";
import { useAudioCapture } from "../state/useAudioCapture.ts";
import "./AudioCapture.css";
export default function AudioCapture({
  disabled,
  onError,
}: {
  disabled: boolean;
  onError: (message: string) => void;
}) {
  const [source, setSource] = useState<"microphone" | "tab">("microphone");
  const audio = useAudioCapture(onError);
  return (
    <div className="audio-capture">
      <div role="group" aria-label="Audio source">
        <button
          className="icon-button"
          aria-label="Microphone source"
          aria-pressed={source === "microphone"}
          disabled={audio.recording || audio.busy}
          onClick={() => setSource("microphone")}
        >
          <Mic />
        </button>
        <button
          className="icon-button"
          aria-label="Tab audio source"
          aria-pressed={source === "tab"}
          disabled={audio.recording || audio.busy}
          onClick={() => setSource("tab")}
        >
          <Monitor />
        </button>
      </div>
      <button
        className={`record-button ${audio.recording ? "is-recording" : ""}`}
        onClick={() =>
          audio.recording ? audio.stop() : void audio.start(source)
        }
        disabled={audio.busy || (disabled && !audio.recording)}
      >
        {audio.busy ? <LoaderCircle /> : audio.recording ? <Square /> : <Mic />}
        {audio.opening
          ? "Opening audio"
          : audio.busy
            ? "Transcribing"
            : audio.recording
              ? "Transcribe"
              : "Capture audio"}
      </button>
    </div>
  );
}
