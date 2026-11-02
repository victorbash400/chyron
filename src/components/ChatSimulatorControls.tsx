import { useState, type FormEvent } from "react";
import { Play, Square, LoaderCircle } from "lucide-react";
import {
  defaultSimulatorSettings,
  type SimulatorSettings,
} from "../../shared/simulator.ts";
import type { NewsroomState } from "../../shared/types.ts";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./ChatSimulatorControls.css";

export default function ChatSimulatorControls({
  simulator,
  demoActive,
  disabled,
  onStart,
  onStop,
}: {
  demoActive: boolean;
  simulator: NewsroomState["simulator"];
  disabled: boolean;
  onStart: (settings: SimulatorSettings) => Promise<boolean>;
  onStop: () => void;
}) {
  const [topic, setTopic] = useState("Live stream discussion");
  const active = demoActive || simulator.status !== "idle";
  async function start(event: FormEvent) {
    event.preventDefault();
    if (!active && topic.trim())
      await onStart({ ...defaultSimulatorSettings, topic: topic.trim() });
  }
  return (
    <form className="chat-simulator" onSubmit={(event) => void start(event)}>
      <input
        aria-label="Demo chat topic"
        placeholder="Demo topic"
        maxLength={500}
        value={topic}
        disabled={active || disabled}
        onChange={(event) => setTopic(event.target.value)}
      />
      <SettingsInlineButton
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
        {active ? "Stop demo chat" : "Start demo chat"}
      </SettingsInlineButton>
    </form>
  );
}
