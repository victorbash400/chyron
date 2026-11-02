import Dialog from "./Dialog.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./LogoutDialog.css";
export default function LogoutDialog({
  busy,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog title="Log out?" onClose={onClose}>
      <div className="logout-actions">
        <SettingsInlineButton disabled={busy} onClick={onClose}>
          Cancel
        </SettingsInlineButton>
        <SettingsInlineButton primary disabled={busy} onClick={onConfirm}>
          Log out
        </SettingsInlineButton>
      </div>
    </Dialog>
  );
}
