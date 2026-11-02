import { useState, type FormEvent } from "react";
import { Play, Square, LoaderCircle } from "lucide-react";
import {
  defaultSimulatorSettings,
  type SimulatorSettings,
} from "../../shared/simulator.ts";
import type { NewsroomState } from "../../shared/types.ts";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./ChatSimulatorControls.css";

export default function ChatSimulatorControls({
  simulator,
  disabled,
  onStart,
  onStop,
}: {
  simulator: NewsroomState["simulator"];
  disabled: boolean;
  onStart: (settings: SimulatorSettings) => Promise<boolean>;
  onStop: () => void;
}) {
  const [topic, setTopic] = useState("");
  const active = simulator.status !== "idle";
  async function start(event: FormEvent) {
    event.preventDefault();
    if (!active && topic.trim())
      await onStart({ ...defaultSimulatorSettings, topic: topic.trim() });
  }
  return (
    <form className="chat-simulator" onSubmit={(event) => void start(event)}>
      <SettingsGroup>
        <SettingsRow compact label="Test topic">
          <input
            aria-label="Simulation topic"
            maxLength={500}
            value={topic}
            disabled={active || disabled}
            onChange={(event) => setTopic(event.target.value)}
          />
        </SettingsRow>
        <SettingsRow compact label="Simulation">
          {simulator.total > 0 && (
            <output aria-live="polite">
              {simulator.delivered} / {simulator.total}
            </output>
          )}
          <SettingsInlineButton
            aria-label={active ? "Stop simulation" : "Start simulation"}
            type={active ? "button" : "submit"}
            onClick={active ? onStop : undefined}
            disabled={active ? false : disabled || !topic.trim()}
          >
            {simulator.status === "generating" ? (
              <LoaderCircle className="simulator-working" />
            ) : active ? (
              <Square />
            ) : (
              <Play />
            )}
            {active ? "Stop" : "Start"}
          </SettingsInlineButton>
        </SettingsRow>
      </SettingsGroup>
    </form>
  );
}
