import { useEffect, useState } from "react";

export function useWorkspaceNavigation() {
  const [settings, setSettings] = useState(location.pathname === "/settings");
  useEffect(() => {
    const update = () => setSettings(location.pathname === "/settings");
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  function navigate(settings: boolean) {
    history.pushState(null, "", settings ? "/settings" : "/");
    setSettings(settings);
  }
  return { settings, navigate };
}
