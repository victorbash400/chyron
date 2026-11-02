import {
  Captions,
  MessageCircle,
  Settings2,
  CircleUserRound,
  PanelLeft,
} from "lucide-react";
import type { WorkspacePanel } from "../state/useWorkspaceNavigation.ts";
import ToolbarGroup from "./controls/ToolbarGroup.tsx";
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
          <IconButton
            label="Open styles"
            title="Open styles"
            onClick={onStyles}
          >
            <PanelLeft />
          </IconButton>
        </div>
        <ChyronBrand />
      </div>
      <ToolbarGroup className={styles.actions} label="Workspace panels">
        <IconButton
          label="Chyron controls"
          title="Chyron controls"
          selected={panel === "chyron"}
          onClick={() => onPanel("chyron")}
        >
          <Captions />
        </IconButton>
        <IconButton
          label="Settings"
          title="Settings"
          selected={panel === "settings"}
          onClick={() => onPanel("settings")}
        >
          <Settings2 />
        </IconButton>
        <IconButton
          label="Chat"
          title="Chat"
          selected={panel === "chat"}
          onClick={() => onPanel("chat")}
        >
          <MessageCircle />
        </IconButton>
        <IconButton
          label="Account"
          title="Account"
          selected={panel === "account"}
          onClick={() => onPanel("account")}
        >
          <CircleUserRound />
        </IconButton>
      </ToolbarGroup>
    </header>
  );
}
