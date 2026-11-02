import { LoaderCircle } from "lucide-react";
import type { NewsroomState } from "../../shared/types.ts";
import type { useVoiceSummaries } from "../state/useVoiceSummaries.ts";
import ToggleSwitch from "./controls/ToggleSwitch.tsx";
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
  return (
    <div
      className="chat-summary-controls"
      role="group"
      aria-label="Summary sources"
    >
      <div className="chat-summary-source">
        <span>Chat summaries</span>
        <ToggleSwitch
          label="Chat summaries"
          checked={chat}
          disabled={busy}
          onChange={onChat}
        />
      </div>
      <div className="chat-summary-source">
        <span>Voice summaries</span>
        {voice.opening && (
          <LoaderCircle
            className="summary-working"
            aria-label="Starting voice"
          />
        )}
        <ToggleSwitch
          label="Voice summaries"
          checked={voice.active}
          disabled={
            busy || voice.opening || (voice.pending > 0 && !voice.active)
          }
          onChange={(enabled) =>
            enabled ? void voice.start() : void voice.stop()
          }
        />
      </div>
    </div>
  );
}
