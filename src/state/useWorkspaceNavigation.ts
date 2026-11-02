import { useEffect, useState } from "react";
export type WorkspacePanel = "news" | "settings" | "chat" | "account";
function currentPanel(): WorkspacePanel {
  if (location.pathname === "/settings/news") return "news";
  if (location.pathname.startsWith("/settings")) return "settings";
  if (location.pathname === "/chat") return "chat";
  if (location.pathname === "/account") return "account";
  return "news";
}
export function useWorkspaceNavigation() {
  const [panel, setPanel] = useState<WorkspacePanel | null>(currentPanel);
  useEffect(() => {
    const update = () => setPanel(currentPanel());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  function navigate(next: WorkspacePanel | null) {
    const path =
      next === "settings"
        ? "/settings"
        : next === "chat"
          ? "/chat"
          : next === "account"
            ? "/account"
            : "/";
    history.pushState(null, "", path);
    setPanel(next);
  }
  return {
    panel,
    navigate,
    toggle: (next: WorkspacePanel) => navigate(panel === next ? null : next),
  };
}
