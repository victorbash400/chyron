import { Radio, Unplug, RotateCw } from "lucide-react";
import type { NewsroomState } from "../../shared/types.ts";
import "./ChannelHeader.css";
export default function ChannelHeader({
  state,
  busy,
  onReconnect,
  onDisconnect,
  onSetup,
}: {
  state: NewsroomState;
  busy: boolean;
  onReconnect: () => void;
  onDisconnect: () => void;
  onSetup: () => void;
}) {
  return (
    <header className="channel-header">
      <a className="wordmark" href="/">
        chyron<span>.</span>
      </a>
      <div className="channel-connection">
        {state.channel && (
          <span className="channel-name">{state.channel.name}</span>
        )}
        <span
          className={`connection-state ${state.connection === "connected" ? "is-connected" : ""}`}
        >
          {state.connection === "connected"
            ? "Connected"
            : state.connection === "connecting"
              ? "Connecting"
              : state.mode === "simulation"
                ? "Simulation"
                : "Disconnected"}
        </span>
        {state.channel ? (
          <>
            <button
              className="icon-button"
              aria-label="Reconnect Twitch"
              onClick={onReconnect}
              disabled={busy}
            >
              <RotateCw />
            </button>
            <button
              className="icon-button"
              aria-label="Disconnect Twitch"
              onClick={onDisconnect}
              disabled={busy}
            >
              <Unplug />
            </button>
          </>
        ) : (
          <button className="connect-button" onClick={onSetup}>
            <Radio />
            Connect Twitch
          </button>
        )}
      </div>
    </header>
  );
}
