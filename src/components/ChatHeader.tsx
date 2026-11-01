import { X } from "lucide-react";
import IconButton from "./controls/IconButton.tsx";
import styles from "./ChatHeader.module.css";

export default function ChatHeader({
  count,
  simulation,
  onClose,
}: {
  count: number;
  simulation: boolean;
  onClose: () => void;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.chatControls}>
        <span>{simulation ? "Simulation chat" : "Chat"}</span>
        <small className="chat-message-count">{count}</small>
        <IconButton label="Close chat" onClick={onClose}>
          <X />
        </IconButton>
      </div>
    </header>
  );
}
