import { useCallback, useEffect, useState } from "react";
import type { Bootstrap, NewsroomState } from "../../shared/types.ts";
import { api } from "./api.ts";
export function useNewsroom() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    let active = true;
    let stream: EventSource | undefined;
    void api<Bootstrap>("/api/bootstrap")
      .then((value) => {
        if (!active) return;
        setBootstrap(value);
        setError(null);
        stream = new EventSource("/api/events");
        stream.onopen = () => {
          if (active) setOnline(true);
        };
        stream.addEventListener("state", (event) => {
          if (!active) return;
          try {
            const state = JSON.parse(
              (event as MessageEvent).data,
            ) as NewsroomState;
            setBootstrap((previous) =>
              previous ? { ...previous, state } : null,
            );
          } catch {
            setError("Invalid live update. Reconnect Chyron.");
            stream?.close();
            setOnline(false);
          }
        });
        stream.onerror = () => {
          if (active) {
            setOnline(false);
            setError("Chyron connection lost. Reconnect.");
            stream?.close();
          }
        };
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
      stream?.close();
    };
  }, [attempt]);
  const act = useCallback(async (path: string, body: unknown = {}) => {
    setPending((n) => n + 1);
    setError(null);
    try {
      await api(path, body);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Request failed.");
      return false;
    } finally {
      setPending((n) => n - 1);
    }
  }, []);
  return {
    bootstrap,
    error,
    setError,
    online,
    pending: pending > 0,
    act,
    reconnect: () => setAttempt((n) => n + 1),
  };
}
