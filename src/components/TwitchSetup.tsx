import { useState, type FormEvent } from "react";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import Dialog from "./Dialog.tsx";
import ErrorNotice from "./ErrorNotice.tsx";
import "./TwitchSetup.css";
export default function TwitchSetup({
  onClose,
  onSave,
  error,
}: {
  onClose: () => void;
  error?: string | null;
  onSave: (clientId: string, clientSecret: string) => Promise<boolean>;
}) {
  const [clientId, setClientId] = useState(""),
    [clientSecret, setClientSecret] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    if (await onSave(clientId, clientSecret))
      location.assign("/api/twitch/connect");
    else setBusy(false);
  }
  return (
    <Dialog title="Twitch application" onClose={onClose}>
      {error && <ErrorNotice error={error} />}
      <form className="twitch-setup" onSubmit={(event) => void submit(event)}>
        <a
          className="developer-link"
          href="https://dev.twitch.tv/console/apps"
          target="_blank"
          rel="noreferrer"
        >
          Developer Console
        </a>
        <label>
          OAuth redirect URL
          <input
            readOnly
            value={`${location.origin}/api/twitch/callback`}
            onFocus={(event) => event.target.select()}
          />
        </label>
        <label>
          Client ID
          <input
            autoFocus
            autoComplete="off"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            required
          />
        </label>
        <label>
          Client secret
          <input
            type="password"
            autoComplete="new-password"
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
            required
          />
        </label>
        <SettingsInlineButton
          primary
          type="submit"
          className="twitch-connect"
          disabled={busy || !clientId.trim() || !clientSecret.trim()}
        >
          Connect Twitch
        </SettingsInlineButton>
      </form>
    </Dialog>
  );
}
