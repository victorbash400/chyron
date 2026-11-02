import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import type { WorkspacePanel } from "../state/useWorkspaceNavigation.ts";
import { useRailOverlay } from "../state/useRailOverlay.ts";
import IconButton from "./controls/IconButton.tsx";
import "./WorkspaceRail.css";
const titles = {
  chyron: "Chyron controls",
  settings: "Settings",
  chat: "Chat",
  account: "Account",
};
export default function WorkspaceRail({
  panel,
  onClose,
  controls,
  settings,
  chat,
  account,
  actions,
}: {
  panel: WorkspacePanel | null;
  onClose: () => void;
  controls: ReactNode;
  settings: ReactNode;
  chat: ReactNode;
  account: ReactNode;
  actions?: ReactNode;
}) {
  const overlay = useRailOverlay();
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!panel || !overlay) return;
    const previous = document.activeElement;
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [Boolean(panel), overlay]);
  return (
    <>
      {overlay && panel && (
        <button
          className="workspace-rail-backdrop"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      )}
      <aside
        ref={root}
        className="workspace-rail"
        hidden={!panel}
        role={overlay ? "dialog" : undefined}
        aria-modal={overlay && panel ? true : undefined}
        aria-label={panel ? titles[panel] : "Workspace sidebar"}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key !== "Tab" || !overlay) return;
          const controls = Array.from(
            root.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled)",
            ) ?? [],
          ).filter((element) => element.getClientRects().length > 0);
          const first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="panel-heading">
          <h2>{panel ? titles[panel] : ""}</h2>
          {actions}
          <IconButton label="Close sidebar" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div className="workspace-rail-pane" hidden={panel !== "chyron"}>
          {controls}
        </div>
        <div className="workspace-rail-pane" hidden={panel !== "settings"}>
          {settings}
        </div>
        <div className="workspace-rail-pane" hidden={panel !== "chat"}>
          {chat}
        </div>
        <div className="workspace-rail-pane" hidden={panel !== "account"}>
          {account}
        </div>
      </aside>
    </>
  );
}
