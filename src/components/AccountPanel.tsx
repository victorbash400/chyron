import type { StreamerAccount } from "../../shared/session.ts";
import type { NewsroomState } from "../../shared/types.ts";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./AccountPanel.css";
export default function AccountPanel({
  account,
  state,
  configured,
  busy,
  onConnect,
  onReconnect,
  onDisconnect,
  onLogout,
}: {
  account: StreamerAccount | null;
  state: NewsroomState;
  configured: boolean;
  busy: boolean;
  onConnect: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
  onLogout: () => void;
}) {
  const status =
    state.connection === "connected"
      ? "Connected"
      : state.connection === "connecting"
        ? "Connecting"
        : "Disconnected";
  return (
    <div className="account-panel">
      <SettingsGroup>
        {(account || state.channel) && (
          <SettingsRow label="Twitch">
            <span>{account?.name ?? state.channel?.name}</span>
          </SettingsRow>
        )}
        <SettingsRow label="Stream">
          {state.connection === "connected" ||
          state.connection === "connecting" ? (
            <SettingsInlineButton disabled={busy} onClick={onDisconnect}>
              Disconnect
            </SettingsInlineButton>
          ) : (
            <SettingsInlineButton
              primary
              disabled={busy || !configured}
              onClick={state.channel ? onReconnect : onConnect}
            >
              {state.channel ? "Reconnect" : "Connect Twitch"}
            </SettingsInlineButton>
          )}
        </SettingsRow>
        <SettingsRow label="Status">
          <span>{status}</span>
        </SettingsRow>
        <SettingsRow label="Account">
          <SettingsInlineButton disabled={busy} onClick={onLogout}>
            Log out
          </SettingsInlineButton>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}
