import { useEffect, useState } from "react";
import type { SettingsSection } from "../components/settings/SettingsNavigation.tsx";
export type WorkspacePanel = "news" | "settings" | "chat" | "account";
function currentPanel(): WorkspacePanel {
  if (location.pathname.startsWith("/settings")) return "settings";
  if (location.pathname === "/chat") return "chat";
  if (location.pathname === "/account") return "account";
  return "news";
}
export function useWorkspaceNavigation() {
  const [panel, setPanel] = useState<WorkspacePanel | null>(currentPanel);
  const [section, setSection] = useState<SettingsSection>(
    location.pathname === "/settings/news" ? "news" : "appearance",
  );
  useEffect(() => {
    const update = () => {
      setPanel(currentPanel());
      setSection(
        location.pathname === "/settings/news" ? "news" : "appearance",
      );
    };
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  function navigate(
    next: WorkspacePanel | null,
    nextSection: SettingsSection = section,
  ) {
    const path =
      next === "settings"
        ? nextSection === "news"
          ? "/settings/news"
          : "/settings"
        : next === "chat"
          ? "/chat"
          : next === "account"
            ? "/account"
            : "/";
    history.pushState(null, "", path);
    setPanel(next);
    setSection(nextSection);
  }
  return {
    panel,
    section,
    navigate,
    toggle: (next: WorkspacePanel) => navigate(panel === next ? null : next),
  };
}
