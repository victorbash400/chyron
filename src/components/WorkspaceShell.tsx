import type { ReactNode } from "react";
import { useRailOverlay } from "../state/useRailOverlay.ts";
import { useNarrowLayout } from "../state/useNarrowLayout.ts";
import WorkspaceRail from "./WorkspaceRail.tsx";
import "./WorkspaceShell.css";

export default function WorkspaceShell({
  header,
  styles,
  stories,
  preview,
  controls,
  chat,
  settings,
  stylesOpen,
  chatOpen,
}: {
  header: ReactNode;
  styles: ReactNode;
  stories: ReactNode;
  preview: ReactNode;
  controls: ReactNode;
  chat: ReactNode;
  settings?: ReactNode;
  stylesOpen: boolean;
  chatOpen: boolean;
}) {
  const narrow = useNarrowLayout();
  const railOverlay = useRailOverlay();
  return (
    <div className="workspace-shell">
      {styles}
      <div className="workspace-main" inert={narrow && stylesOpen}>
        {header}
        <div className="workspace-body" hidden={Boolean(settings)}>
          <main className="workspace-content">
            <div className="workspace-center" inert={railOverlay && chatOpen}>
              {preview}
              {stories}
            </div>
            <WorkspaceRail chat={chat} controls={controls} open={chatOpen} />
          </main>
        </div>
        {settings}
      </div>
    </div>
  );
}
