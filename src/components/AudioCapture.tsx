import { useState } from "react";
import { Mic, Square, LoaderCircle } from "lucide-react";
import AudioSourcePicker from "./AudioSourcePicker.tsx";
import AudioTranscript from "./AudioTranscript.tsx";
import { useAudioCapture } from "../state/useAudioCapture.ts";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./AudioCapture.css";

export default function AudioCapture({
  sourceId,
  disabled,
  onError,
}: {
  sourceId: string;
  disabled: boolean;
  onError: (message: string) => void;
}) {
  const [source, setSource] = useState<"microphone" | "tab">("microphone");
  const audio = useAudioCapture(sourceId, onError, disabled);
  const busy = audio.pending > 0;
  return (
    <SettingsGroup>
      <SettingsRow compact label="Audio input">
        <AudioSourcePicker
          source={source}
          disabled={audio.recording || busy || audio.opening || disabled}
          onChange={setSource}
        />
      </SettingsRow>
      <SettingsRow compact label="Audio capture">
        <SettingsInlineButton
          aria-label={
            audio.recording ? "Stop audio capture" : "Start audio capture"
          }
          className={audio.recording ? "audio-recording" : ""}
          onClick={() =>
            audio.recording ? audio.stop() : void audio.start(source)
          }
          disabled={
            audio.opening ||
            (busy && !audio.recording) ||
            (disabled && !audio.recording)
          }
        >
          {audio.recording ? (
            <Square />
          ) : audio.opening || busy ? (
            <LoaderCircle />
          ) : (
            <Mic />
          )}
          {audio.opening
            ? "Opening audio"
            : audio.recording
              ? "Stop"
              : busy
                ? "Transcribing"
                : "Start"}
        </SettingsInlineButton>
      </SettingsRow>
      {audio.transcript && <AudioTranscript text={audio.transcript} />}
    </SettingsGroup>
  );
}
