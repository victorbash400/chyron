import { useState } from "react";
import { Mic, Monitor, Square, LoaderCircle } from "lucide-react";
import { useAudioCapture } from "../state/useAudioCapture.ts";
import IconButton from "./controls/IconButton.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
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
    <>
      <SettingsRow compact label="Audio input">
        <div
          className="audio-source-picker"
          role="group"
          aria-label="Audio source"
        >
          <IconButton
            label="Microphone source"
            selected={source === "microphone"}
            disabled={audio.recording || audio.busy}
            onClick={() => setSource("microphone")}
          >
            <Mic />
          </IconButton>
          <IconButton
            label="Tab audio source"
            selected={source === "tab"}
            disabled={audio.recording || audio.busy}
            onClick={() => setSource("tab")}
          >
            <Monitor />
          </IconButton>
        </div>
      </SettingsRow>
      <SettingsRow compact label="Transcription">
        <SettingsInlineButton
          className={audio.recording ? "audio-recording" : ""}
          onClick={() =>
            audio.recording ? audio.stop() : void audio.start(source)
          }
          disabled={audio.busy || (disabled && !audio.recording)}
        >
          {audio.busy ? (
            <LoaderCircle />
          ) : audio.recording ? (
            <Square />
          ) : (
            <Mic />
          )}
          {audio.opening
            ? "Opening audio"
            : audio.busy
              ? "Transcribing"
              : audio.recording
                ? "Transcribe"
                : "Capture audio"}
        </SettingsInlineButton>
      </SettingsRow>
    </>
  );
}
