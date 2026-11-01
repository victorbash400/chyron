import type { SettingsSection } from "../components/settings/SettingsNavigation.tsx";
import { useEffect, useState } from "react";

export function useWorkspaceNavigation() {
  const [settings, setSettings] = useState(
    location.pathname.startsWith("/settings"),
  );
  const [section, setSection] = useState<SettingsSection>(
    location.pathname === "/settings/news" ? "news" : "appearance",
  );
  useEffect(() => {
    const update = () => {
      setSettings(location.pathname.startsWith("/settings"));
      setSection(
        location.pathname === "/settings/news" ? "news" : "appearance",
      );
    };
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  function navigate(
    settings: boolean,
    section: SettingsSection = "appearance",
  ) {
    history.pushState(
      null,
      "",
      settings ? (section === "news" ? "/settings/news" : "/settings") : "/",
    );
    setSettings(settings);
    setSection(section);
  }
  return { settings, section, navigate };
}
