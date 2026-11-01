import { Eye, EyeOff, Pause, Play, Sparkles } from "lucide-react";
import type { NewsroomState } from "../../shared/types.ts";
import "./NewsroomControls.css";
export default function NewsroomControls({
  state,
  busy,
  onSettings,
  onGenerate,
  onMode,
}: {
  state: NewsroomState;
  busy: boolean;
  onSettings: (patch: Partial<NewsroomState>) => void;
  onGenerate: () => void;
  onMode: (mode: NewsroomState["mode"]) => void;
}) {
  return (
    <>
      <div className="source-switch" role="group" aria-label="Chat source">
        <button
          aria-pressed={state.mode === "twitch"}
          onClick={() => onMode("twitch")}
          disabled={busy || state.working}
        >
          Twitch
        </button>
        <button
          aria-pressed={state.mode === "simulation"}
          onClick={() => onMode("simulation")}
          disabled={busy || state.working}
        >
          Simulation
        </button>
      </div>
      <div className="newsroom-controls">
        <button
          className="automatic-control"
          role="switch"
          aria-checked={state.automatic}
          onClick={() => onSettings({ automatic: !state.automatic })}
          disabled={busy}
        >
          <span className="switch-track">
            <span />
          </span>
          Auto publish
        </button>
        <button
          className="icon-button"
          aria-label={state.paused ? "Resume coverage" : "Pause coverage"}
          onClick={() => onSettings({ paused: !state.paused })}
          disabled={busy}
        >
          {state.paused ? <Play /> : <Pause />}
        </button>
        <button
          className="icon-button"
          aria-label={state.visible ? "Hide overlay" : "Show overlay"}
          onClick={() => onSettings({ visible: !state.visible })}
          disabled={busy}
        >
          {state.visible ? <Eye /> : <EyeOff />}
        </button>
        <button
          className={`icon-button ${state.working ? "is-working" : ""}`}
          aria-label="Generate coverage"
          onClick={onGenerate}
          disabled={
            busy || state.working || state.paused || !state.messages.length
          }
        >
          <Sparkles />
        </button>
      </div>
    </>
  );
}
