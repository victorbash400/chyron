import { useEffect, useRef, useState } from "react";
import {
  CircleUserRound,
  ChevronDown,
  Radio,
  RotateCw,
  Unplug,
} from "lucide-react";
import type { NewsroomState } from "../../shared/types.ts";
import "./AccountMenu.css";
export default function AccountMenu({
  state,
  busy,
  onReconnect,
  onDisconnect,
  onSetup,
}: {
  state: NewsroomState;
  busy: boolean;
  onReconnect: () => void;
  onDisconnect: () => void;
  onSetup: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function run(action: () => void) {
    setOpen(false);
    action();
  }
  return (
    <div
      className="account-menu"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        className="account-trigger"
        aria-label={state.channel?.name ?? "Connect Twitch"}
        ref={trigger}
        aria-expanded={open}
        aria-controls="account-actions"
        onClick={() => setOpen(!open)}
      >
        <span className="account-avatar">
          <CircleUserRound />
        </span>
        <span className="account-name">
          {state.channel?.name ?? "Connect Twitch"}
        </span>
        <ChevronDown />
      </button>
      {open && (
        <div className="account-actions" id="account-actions">
          <span
            className={`account-status ${state.connection === "connected" ? "is-connected" : ""}`}
          >
            {state.mode === "simulation"
              ? "Simulation"
              : state.connection === "connected"
                ? "Connected"
                : state.connection === "connecting"
                  ? "Connecting"
                  : "Disconnected"}
          </span>
          {state.channel ? (
            <>
              <button disabled={busy} onClick={() => run(onReconnect)}>
                <RotateCw />
                Reconnect Twitch
              </button>
              <button disabled={busy} onClick={() => run(onDisconnect)}>
                <Unplug />
                Disconnect Twitch
              </button>
            </>
          ) : (
            <button onClick={() => run(onSetup)}>
              <Radio />
              Connect Twitch
            </button>
          )}
        </div>
      )}
    </div>
  );
}
