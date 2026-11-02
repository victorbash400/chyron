import { Mic, Square, LoaderCircle } from "lucide-react";
import AudioSourcePicker from "./AudioSourcePicker.tsx";
import AudioTranscript from "./AudioTranscript.tsx";
import type { useVoiceSummaries } from "../state/useVoiceSummaries.ts";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./AudioCapture.css";

export default function AudioCapture({
  audio,
}: {
  audio: ReturnType<typeof useVoiceSummaries>;
}) {
  const busy = audio.pending > 0;
  return (
    <SettingsGroup>
      <SettingsRow compact label="Audio input">
        {audio.broadcast ? (
          <span>Broadcast</span>
        ) : (
          <AudioSourcePicker
            source={audio.source}
            disabled={audio.recording || busy || audio.opening}
            onChange={audio.setSource}
          />
        )}
      </SettingsRow>
      <SettingsRow compact label="Audio capture">
        <SettingsInlineButton
          aria-label={
            audio.recording ? "Stop audio capture" : "Start audio capture"
          }
          className={audio.recording ? "audio-recording" : ""}
          onClick={() =>
            audio.recording ? void audio.stop() : void audio.start()
          }
          disabled={audio.opening || (busy && !audio.recording)}
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
