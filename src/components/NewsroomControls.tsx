import IconButton from "./controls/IconButton.tsx";
import { Check, Link, Pause, Play, Settings2 } from "lucide-react";
import { useState } from "react";
import type { NewsroomState, SourceMode } from "../../shared/types.ts";
import ToggleSwitch from "./controls/ToggleSwitch.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SourceSwitch from "./SourceSwitch.tsx";
import SimulationScenarios from "./SimulationScenarios.tsx";
import AudioCapture from "./AudioCapture.tsx";
import "./NewsroomControls.css";

export default function NewsroomControls({
  state,
  url,
  busy,
  onSettings,
  onError,
  onMode,
  onScenario,
  onOpenSettings,
}: {
  onOpenSettings: () => void;
  state: NewsroomState;
  url: string;
  busy: boolean;
  onSettings: (patch: { automatic?: boolean; paused?: boolean }) => void;
  onError: (error: string) => void;
  onMode: (mode: SourceMode) => void;
  onScenario: (scenario: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      onError(
        "Could not copy overlay URL. Open the overlay to copy its address.",
      );
    }
  }
  return (
    <section
      className="workspace-panel newsroom-controls"
      aria-label="News controls"
    >
      <div className="panel-heading">
        <h2>News controls</h2>
        <IconButton label="Open news settings" onClick={onOpenSettings}>
          <Settings2 />
        </IconButton>
      </div>
      <SettingsGroup className="newsroom-control-rows">
        <SettingsRow compact label="Source">
          <SourceSwitch
            mode={state.mode}
            disabled={busy || state.working}
            onChange={onMode}
          />
        </SettingsRow>
        {state.mode === "simulation" && (
          <SettingsRow compact label="Scenario">
            <SimulationScenarios
              busy={busy || state.paused}
              onScenario={onScenario}
            />
          </SettingsRow>
        )}
        <AudioCapture disabled={state.paused} onError={onError} />
        <SettingsRow compact label="Coverage">
          <SettingsInlineButton
            onClick={() => onSettings({ paused: !state.paused })}
            disabled={busy}
          >
            {state.paused ? <Play /> : <Pause />}
            {state.paused ? "Resume" : "Pause"}
          </SettingsInlineButton>
        </SettingsRow>
        <SettingsRow compact label="Auto publish">
          <ToggleSwitch
            label="Auto publish"
            checked={state.automatic}
            onChange={(automatic) => onSettings({ automatic })}
            disabled={busy}
          />
        </SettingsRow>
        <SettingsRow compact label="Overlay">
          <SettingsInlineButton
            onClick={() => void copy()}
            onBlur={() => setCopied(false)}
          >
            {copied ? <Check /> : <Link />}
            {copied ? "Copied" : "Copy link"}
          </SettingsInlineButton>
        </SettingsRow>
      </SettingsGroup>
    </section>
  );
}
