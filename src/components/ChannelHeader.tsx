import type { Ref } from "react";
import type { NewsroomState } from "../../shared/types.ts";
import {
  SlidersHorizontal,
  ArrowLeft,
  MessageCircle,
  PanelLeft,
} from "lucide-react";
import IconButton from "./controls/IconButton.tsx";
import AccountMenu from "./AccountMenu.tsx";
import styles from "./ChannelHeader.module.css";
import "./ChannelHeader.css";

export default function ChannelHeader({
  state,
  busy,
  onReconnect,
  onDisconnect,
  onSetup,
  settings,
  onNavigate,
  onStyles,
  chatOpen,
  onChat,
  chatTrigger,
}: {
  chatTrigger?: Ref<HTMLButtonElement>;
  onStyles: () => void;
  chatOpen: boolean;
  onChat: () => void;
  settings: boolean;
  onNavigate: (settings: boolean) => void;
  state: NewsroomState;
  busy: boolean;
  onReconnect: () => void;
  onDisconnect: () => void;
  onSetup: () => void;
}) {
  return (
    <header className={`${styles.toolbar} channel-header`}>
      <div className={styles.navigation}>
        <div className={styles.mobile}>
          <IconButton label="Open styles" onClick={onStyles}>
            <PanelLeft />
          </IconButton>
        </div>
        {settings ? (
          <IconButton
            className={styles.back}
            label="Back to preview"
            onClick={() => onNavigate(false)}
          >
            <ArrowLeft />
          </IconButton>
        ) : null}
      </div>
      <div className={styles.actions}>
        <div className={styles.group}>
          <IconButton
            ref={chatTrigger}
            label="Chat"
            selected={chatOpen && !settings}
            onClick={() => {
              if (settings) onNavigate(false);
              onChat();
            }}
          >
            <MessageCircle />
          </IconButton>
        </div>
        <div className={styles.group}>
          <IconButton
            label="Settings"
            selected={settings}
            onClick={() => onNavigate(!settings)}
          >
            <SlidersHorizontal />
          </IconButton>
        </div>
        <AccountMenu
          state={state}
          busy={busy}
          onReconnect={onReconnect}
          onDisconnect={onDisconnect}
          onSetup={onSetup}
        />
      </div>
    </header>
  );
}
