import { useState, type FormEvent } from "react";
import { Play, Square, LoaderCircle } from "lucide-react";
import {
  defaultSimulatorSettings,
  type SimulatorSettings,
} from "../../shared/simulator.ts";
import type { NewsroomState } from "../../shared/types.ts";
import SettingsChoice from "./settings/SettingsChoice.tsx";
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
  const [settings, setSettings] = useState(defaultSimulatorSettings);
  const active = simulator.status !== "idle";
  async function start(event: FormEvent) {
    event.preventDefault();
    if (!active && settings.topic.trim()) await onStart(settings);
  }
  return (
    <form className="chat-simulator" onSubmit={(event) => void start(event)}>
      <input
        aria-label="Simulation topic"
        placeholder="Simulation topic"
        maxLength={500}
        value={settings.topic}
        disabled={active || disabled}
        onChange={(event) =>
          setSettings({ ...settings, topic: event.target.value })
        }
      />
      <div className="chat-simulator-options">
        <SettingsChoice
          label="Simulated users"
          value={settings.users}
          options={[
            { value: 3, label: "3 users" },
            { value: 5, label: "5 users" },
            { value: 8, label: "8 users" },
          ]}
          disabled={active || disabled}
          onChange={(users) => setSettings({ ...settings, users })}
        />
        <SettingsChoice
          label="Simulation messages"
          value={settings.messages}
          options={[
            { value: 12, label: "12 messages" },
            { value: 24, label: "24 messages" },
          ]}
          disabled={active || disabled}
          onChange={(messages) => setSettings({ ...settings, messages })}
        />
        <SettingsChoice
          label="Simulation pace"
          value={settings.intervalMs}
          options={[
            { value: 500, label: "Fast" },
            { value: 1500, label: "Natural" },
            { value: 3000, label: "Slow" },
          ]}
          disabled={active || disabled}
          onChange={(intervalMs) => setSettings({ ...settings, intervalMs })}
        />
      </div>
      <div className="chat-simulator-actions">
        {simulator.total > 0 && (
          <output aria-live="polite">
            {simulator.delivered} / {simulator.total}
          </output>
        )}
        {active ? (
          <SettingsInlineButton onClick={onStop}>
            <Square />
            Stop simulation
          </SettingsInlineButton>
        ) : (
          <SettingsInlineButton
            type="submit"
            disabled={disabled || !settings.topic.trim()}
          >
            <Play />
            Simulate chat
          </SettingsInlineButton>
        )}
        {simulator.status === "generating" && (
          <LoaderCircle
            className="simulator-working"
            aria-label="Generating simulated chat"
          />
        )}
      </div>
    </form>
  );
}
