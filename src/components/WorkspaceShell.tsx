import type { ReactNode } from "react";
import "./WorkspaceShell.css";
export default function WorkspaceShell({
  header,
  toolbar,
  notice,
  stories,
  preview,
  chat,
}: {
  header: ReactNode;
  toolbar: ReactNode;
  notice: ReactNode;
  stories: ReactNode;
  preview: ReactNode;
  chat: ReactNode;
}) {
  return (
    <div className="workspace-shell">
      {header}
      {notice}
      <div className="workspace-toolbar">{toolbar}</div>
      <main className="workspace-content">
        <section className="workspace-stories" aria-label="Newsroom stories">
          {stories}
        </section>
        <aside className="workspace-side">
          {preview}
          {chat}
        </aside>
      </main>
    </div>
  );
}
