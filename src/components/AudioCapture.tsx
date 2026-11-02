import AudioTranscript from "./AudioTranscript.tsx";
import AudioFileButton from "./AudioFileButton.tsx";
import AudioSourcePicker from "./AudioSourcePicker.tsx";
import AudioCaptureMode from "./AudioCaptureMode.tsx";
import { useState } from "react";
import { Mic, Square, LoaderCircle } from "lucide-react";
import { useAudioCapture } from "../state/useAudioCapture.ts";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./AudioCapture.css";

export default function AudioCapture({
  sourceId,
  model,
  disabled,
  onError,
}: {
  sourceId: string;
  model: string;
  disabled: boolean;
  onError: (message: string) => void;
}) {
  const [source, setSource] = useState<"microphone" | "tab">("microphone");
  const [continuous, setContinuous] = useState(false);
  const [seconds, setSeconds] = useState<6 | 12>(6);
  const audio = useAudioCapture(sourceId, onError);
  const busy = audio.pending > 0;
  return (
    <SettingsGroup>
      <SettingsRow compact label="Audio input">
        <AudioSourcePicker
          source={source}
          disabled={audio.recording || busy || audio.opening}
          onChange={setSource}
        />
      </SettingsRow>
      <AudioCaptureMode
        continuous={continuous}
        seconds={seconds}
        disabled={audio.recording || busy || audio.opening}
        onContinuous={setContinuous}
        onSeconds={setSeconds}
      />
      <SettingsRow compact label="Voice model">
        <span>{model}</span>
      </SettingsRow>
      <SettingsRow compact label="Transcription">
        <SettingsInlineButton
          className={audio.recording ? "audio-recording" : ""}
          onClick={() =>
            audio.recording
              ? audio.stop()
              : void audio.start(source, continuous, seconds)
          }
          disabled={
            audio.opening ||
            (busy && !audio.recording) ||
            (disabled && !audio.recording)
          }
        >
          {audio.recording ? <Square /> : busy ? <LoaderCircle /> : <Mic />}
          {audio.opening
            ? "Opening audio"
            : audio.recording
              ? continuous
                ? "Stop capture"
                : "Transcribe"
              : busy
                ? "Transcribing"
                : "Capture audio"}
        </SettingsInlineButton>
        <AudioFileButton
          disabled={disabled || busy || audio.recording || audio.opening}
          onFile={audio.upload}
        />
      </SettingsRow>
      {audio.transcript && <AudioTranscript text={audio.transcript} />}
    </SettingsGroup>
  );
}
