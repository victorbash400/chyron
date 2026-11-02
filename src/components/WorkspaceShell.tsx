import type { ReactNode } from "react";
import "./WorkspaceShell.css";
export default function WorkspaceShell({
  header,
  styles,
  stories,
  preview,
  sidebar,
}: {
  header: ReactNode;
  styles: ReactNode;
  stories: ReactNode;
  preview: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <div className="workspace-shell">
      {header}
      <div className="workspace-layout">
        <main className="workspace-board" aria-label="Broadcast workspace">
          {styles}
          <div className="workspace-center">
            {preview}
            {stories}
          </div>
        </main>
        {sidebar}
      </div>
    </div>
  );
}
