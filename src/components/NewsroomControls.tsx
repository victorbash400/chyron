import ChatSimulatorControls from "./ChatSimulatorControls.tsx";
import type { SimulatorSettings } from "../../shared/simulator.ts";
import { Check, Link, Pause, Play } from "lucide-react";
import { useState } from "react";
import type { NewsroomState, SourceMode } from "../../shared/types.ts";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SourceSwitch from "./SourceSwitch.tsx";
import AudioCapture from "./AudioCapture.tsx";
import "./NewsroomControls.css";

export default function NewsroomControls({
  state,
  broadcastAudioActive,
  url,
  busy,
  onSettings,
  onError,
  onMode,
  onSimulate,
  onStopSimulation,
}: {
  onSimulate: (settings: SimulatorSettings) => Promise<boolean>;
  onStopSimulation: () => void;
  broadcastAudioActive: boolean;
  state: NewsroomState;
  url: string;
  busy: boolean;
  onSettings: (patch: { paused?: boolean }) => void;
  onError: (error: string) => void;
  onMode: (mode: SourceMode) => void;
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
    <section className="newsroom-controls" aria-label="News controls">
      <div className="newsroom-control-groups">
        <SettingsGroup>
          <SettingsRow compact label="Source">
            <SourceSwitch
              mode={state.mode}
              disabled={busy || state.working}
              onChange={onMode}
            />
          </SettingsRow>
        </SettingsGroup>
        {state.mode === "simulation" && (
          <ChatSimulatorControls
            simulator={state.simulator}
            disabled={busy || state.paused}
            onStart={onSimulate}
            onStop={onStopSimulation}
          />
        )}
        <AudioCapture
          sourceId={state.sourceId}
          disabled={state.paused || broadcastAudioActive}
          onError={onError}
        />
        <SettingsGroup>
          <SettingsRow compact label="Coverage">
            <SettingsInlineButton
              onClick={() => onSettings({ paused: !state.paused })}
              disabled={busy}
            >
              {state.paused ? <Play /> : <Pause />}
              {state.paused ? "Resume" : "Pause"}
            </SettingsInlineButton>
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
      </div>
    </section>
  );
}
