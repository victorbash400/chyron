import type { SourceMode } from "../../shared/types.ts";
import "./SourceSwitch.css";
export default function SourceSwitch({
  mode,
  disabled,
  onChange,
}: {
  mode: SourceMode;
  disabled: boolean;
  onChange: (mode: SourceMode) => void;
}) {
  return (
    <div className="source-switch" role="group" aria-label="Chat source">
      {(["twitch", "simulation"] as const).map((source) => (
        <button
          key={source}
          aria-pressed={mode === source}
          disabled={disabled}
          onClick={() => onChange(source)}
        >
          {source === "twitch" ? "Twitch" : "Simulation"}
        </button>
      ))}
    </div>
  );
}
