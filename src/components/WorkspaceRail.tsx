import type { ReactNode } from "react";
import "./WorkspaceRail.css";

export default function WorkspaceRail({
  chat,
  controls,
  open,
}: {
  chat: ReactNode;
  controls: ReactNode;
  open: boolean;
}) {
  return (
    <aside
      className="workspace-rail"
      aria-label="Chat and news controls"
      data-open={open}
    >
      {chat}
      {controls}
    </aside>
  );
}
