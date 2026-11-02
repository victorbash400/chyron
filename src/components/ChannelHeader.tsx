import {
  Newspaper,
  MessageCircle,
  Settings2,
  CircleUserRound,
  PanelLeft,
} from "lucide-react";
import type { WorkspacePanel } from "../state/useWorkspaceNavigation.ts";
import ChyronBrand from "./ChyronBrand.tsx";
import IconButton from "./controls/IconButton.tsx";
import styles from "./ChannelHeader.module.css";
export default function ChannelHeader({
  panel,
  onPanel,
  onStyles,
}: {
  panel: WorkspacePanel | null;
  onPanel: (panel: WorkspacePanel) => void;
  onStyles: () => void;
}) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.navigation}>
        <div className={styles.mobile}>
          <IconButton label="Open styles" onClick={onStyles}>
            <PanelLeft />
          </IconButton>
        </div>
        <ChyronBrand />
      </div>
      <nav className={styles.actions} aria-label="Workspace panels">
        <IconButton
          label="News controls"
          selected={panel === "news"}
          onClick={() => onPanel("news")}
        >
          <Newspaper />
        </IconButton>
        <IconButton
          label="Settings"
          selected={panel === "settings"}
          onClick={() => onPanel("settings")}
        >
          <Settings2 />
        </IconButton>
        <IconButton
          label="Chat"
          selected={panel === "chat"}
          onClick={() => onPanel("chat")}
        >
          <MessageCircle />
        </IconButton>
        <IconButton
          label="Account"
          selected={panel === "account"}
          onClick={() => onPanel("account")}
        >
          <CircleUserRound />
        </IconButton>
      </nav>
    </header>
  );
}
