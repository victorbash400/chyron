import { useEffect, useState } from "react";
import type { OverlayState } from "../../shared/types.ts";
import BroadcastOverlay from "./BroadcastOverlay.tsx";
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
    const path = `/api/overlay/${encodeURIComponent(token)}`;
    void api<OverlayState>(path)
      .then((value) => {
        if (!active) return;
        setState(value);
        setError(null);
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
      document.documentElement.classList.remove("overlay-document");
    };
  }, [token, attempt]);
  return (
    <>
      {state && <BroadcastOverlay state={state} />}{" "}
      {error && (
        <button
          className="overlay-error"
          onClick={() => setAttempt((n) => n + 1)}
        >
          {error} Reconnect
        </button>
      )}
    </>
  );
}
