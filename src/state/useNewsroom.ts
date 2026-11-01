import type { OverlayDesign } from "../../shared/overlayDesign.ts";
import { DesignUpdates, type DesignReceipt } from "./designUpdates.ts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Bootstrap, NewsroomState } from "../../shared/types.ts";
import { api } from "./api.ts";
export function useNewsroom() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(0);
  const [designPatch, setDesignPatch] = useState<Partial<OverlayDesign>>({});
  const designs = useRef<DesignUpdates | null>(null);
  const designRevision = useRef(0);
  useEffect(() => {
    designs.current = new DesignUpdates(
      async (design) => api<DesignReceipt>("/api/settings", { design }),
      setDesignPatch,
      ({ design, revision }) => {
        designRevision.current = revision;
        setBootstrap((previous) =>
          previous && revision >= previous.state.revision
            ? { ...previous, state: { ...previous.state, design } }
            : previous,
        );
      },
      setError,
    );
    return () => designs.current?.dispose();
  }, []);
  const updateDesign = useCallback((patch: Partial<OverlayDesign>) => {
    designs.current?.update(patch);
  }, []);
  useEffect(() => {
    let active = true;
    let stream: EventSource | undefined;
    void api<Bootstrap>("/api/bootstrap")
      .then((value) => {
        if (!active) return;
        designRevision.current = value.state.revision;
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
              previous && state.revision >= previous.state.revision
                ? {
                    ...previous,
                    state: {
                      ...state,
                      design:
                        state.revision < designRevision.current
                          ? previous.state.design
                          : state.design,
                    },
                  }
                : previous,
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
    bootstrap: bootstrap
      ? {
          ...bootstrap,
          state: {
            ...bootstrap.state,
            design: { ...bootstrap.state.design, ...designPatch },
          },
        }
      : null,
    updateDesign,
    error,
    setError,
    online,
    pending: pending > 0,
    act,
    reconnect: () => setAttempt((n) => n + 1),
  };
}
