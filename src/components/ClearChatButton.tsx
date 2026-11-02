import { Trash2 } from "lucide-react";
import IconButton from "./controls/IconButton.tsx";

export default function ClearChatButton({
  disabled,
  onClear,
}: {
  disabled: boolean;
  onClear: () => void;
}) {
  return (
    <IconButton
      label="Clear chat"
      title="Clear Chyron chat"
      disabled={disabled}
      onClick={onClear}
    >
      <Trash2 />
    </IconButton>
  );
}
