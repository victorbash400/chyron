import { LoaderCircle, MessageSquareText, Mic, MicOff } from "lucide-react";
import type { NewsroomState } from "../../shared/types.ts";
import type { useVoiceSummaries } from "../state/useVoiceSummaries.ts";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./ChatSummaryControls.css";

export default function ChatSummaryControls({
  state,
  voice,
  busy,
  onChat,
}: {
  state: NewsroomState;
  voice: ReturnType<typeof useVoiceSummaries>;
  busy: boolean;
  onChat: (enabled: boolean) => void;
}) {
  const chat = !state.paused && state.coverage.includeChat;
  const voiceLabel = voice.opening
    ? "Voice starting"
    : voice.active
      ? "Voice on"
      : "Voice off";
  return (
    <div
      className="chat-summary-controls"
      role="group"
      aria-label="Summary sources"
    >
      <SettingsInlineButton
        aria-label={`Chat summaries ${chat ? "on" : "off"}`}
        aria-pressed={chat}
        disabled={busy}
        onClick={() => onChat(!chat)}
      >
        <MessageSquareText />
        Chat {chat ? "on" : "off"}
      </SettingsInlineButton>
      <SettingsInlineButton
        aria-label={`Voice summaries ${voice.opening ? "starting" : voice.active ? "on" : "off"}`}
        aria-pressed={voice.active}
        disabled={busy || voice.opening || (voice.pending > 0 && !voice.active)}
        onClick={() => (voice.active ? void voice.stop() : void voice.start())}
      >
        {voice.opening ? (
          <LoaderCircle className="summary-working" />
        ) : voice.active ? (
          <Mic />
        ) : (
          <MicOff />
        )}
        {voiceLabel}
      </SettingsInlineButton>
    </div>
  );
}
