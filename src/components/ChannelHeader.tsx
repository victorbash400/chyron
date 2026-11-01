import type { NewsroomState, SourceMode } from "../../shared/types.ts";
import SourceSwitch from "./SourceSwitch.tsx";
import AccountMenu from "./AccountMenu.tsx";
import "./ChannelHeader.css";
export default function ChannelHeader({
  state,
  busy,
  onReconnect,
  onDisconnect,
  onSetup,
  onMode,
}: {
  state: NewsroomState;
  busy: boolean;
  onReconnect: () => void;
  onDisconnect: () => void;
  onSetup: () => void;
  onMode: (mode: SourceMode) => void;
}) {
  return (
    <header className="channel-header">
      <a className="wordmark" href="/">
        chyron<span>.</span>
      </a>
      <SourceSwitch
        mode={state.mode}
        disabled={busy || state.working}
        onChange={onMode}
      />
      <AccountMenu
        state={state}
        busy={busy}
        onReconnect={onReconnect}
        onDisconnect={onDisconnect}
        onSetup={onSetup}
      />
    </header>
  );
}
