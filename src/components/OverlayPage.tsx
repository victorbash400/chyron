import { useEffect, useState } from "react";
import type { OverlayState } from "../../shared/types.ts";
import ErrorNotice from "./ErrorNotice.tsx";
import BroadcastOverlay from "./BroadcastOverlay.tsx";
import { connectRealtime } from "../state/realtime.ts";
import { api } from "../state/api.ts";
import "./OverlayPage.css";
export default function OverlayPage({ token }: { token: string }) {
  const [state, setState] = useState<OverlayState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    document.documentElement.classList.add("overlay-document");
    let active = true,
      events: EventSource | undefined;
    let disconnect: (() => void) | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const path = `/api/overlay/${encodeURIComponent(token)}`;
    const apply = (value: OverlayState) => {
      if (!active) return;
      setState(value);
      clearTimeout(expiry);
      if (value.validUntil)
        expiry = setTimeout(
          () => {
            void refresh().catch((error) => {
              if (active) {
                setError(error.message);
                setState(null);
              }
            });
          },
          Math.max(1, value.validUntil - Date.now() + 50),
        );
    };
    const refresh = async () => apply(await api<OverlayState>(path));
    void api<OverlayState>(path)
      .then((value) => {
        if (!active) return;
        apply(value);
        setError(null);
        if (value.transport === "appsync") {
          disconnect = connectRealtime(
            `${path}/realtime`,
            refresh,
            () => {
              if (active) setError(null);
            },
            (message) => {
              if (active) {
                setError(message);
                setState(null);
              }
            },
          );
          return;
        }
        events = new EventSource(`${path}/events`);
        events.addEventListener("state", (event) => {
          try {
            setState(JSON.parse((event as MessageEvent).data));
          } catch {
            setError("Invalid overlay update.");
            events?.close();
            setState(null);
          }
        });
        events.onerror = () => {
          setError("Overlay disconnected.");
          setState(null);
          events?.close();
        };
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
      events?.close();
      disconnect?.();
      clearTimeout(expiry);
      document.documentElement.classList.remove("overlay-document");
    };
  }, [token, attempt]);
  return (
    <>
      {state && <BroadcastOverlay state={state} />}{" "}
      {error && (
        <ErrorNotice
          error={error}
          onRetry={() => setAttempt((n) => n + 1)}
          retryLabel="Reconnect"
        />
      )}
    </>
  );
}
