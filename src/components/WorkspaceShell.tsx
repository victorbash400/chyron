import type { ReactNode } from "react";
import "./WorkspaceShell.css";
export default function WorkspaceShell({
  header,
  notice,
  styles,
  stories,
  preview,
  chat,
}: {
  header: ReactNode;
  notice: ReactNode;
  styles: ReactNode;
  stories: ReactNode;
  preview: ReactNode;
  chat: ReactNode;
}) {
  return (
    <div className="workspace-shell">
      {header}
      {notice && <div className="workspace-notice">{notice}</div>}
      <main className="workspace-content">
        {styles}
        <div className="workspace-center">
          {preview}
          {stories}
        </div>
        {chat}
      </main>
    </div>
  );
}
