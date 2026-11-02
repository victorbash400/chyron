import { useEffect, useRef, useState } from "react";
import type { NewsroomState } from "../../shared/types.ts";
import type { SimulatorSettings } from "../../shared/simulator.ts";
import { DemoChat } from "./demoChat.ts";

export function useDemoChat(
  state: NewsroomState | undefined,
  online: boolean,
  act: (path: string, body?: unknown) => Promise<boolean>,
) {
  const [queued, setQueued] = useState<SimulatorSettings | null>(null);
  const [active, setActive] = useState(false);
  const controller = useRef<DemoChat | null>(null);
  useEffect(() => {
    const demo = new DemoChat(act, setActive);
    controller.current = demo;
    return () => demo.dispose();
  }, [act]);
  useEffect(() => {
    if (state) controller.current?.observe(state, online);
    if (queued && state?.mode === "simulation" && !state.paused && online) {
      setQueued(null);
      void controller.current?.start(state, queued);
    }
  }, [state, online, queued]);
  return {
    active: active || Boolean(queued),
    start: async (settings: SimulatorSettings) => {
      if (!state || !controller.current) return false;
      if (
        !state.coverage.includeChat &&
        !(await act("/api/settings", { coverage: { includeChat: true } }))
      )
        return false;
      if (state.mode === "simulation" && !state.paused)
        return controller.current.start(state, settings);
      setQueued(settings);
      if (state.paused && !(await act("/api/settings", { paused: false }))) {
        setQueued(null);
        return false;
      }
      if (
        state.mode !== "simulation" &&
        !(await act("/api/mode", { mode: "simulation" }))
      ) {
        setQueued(null);
        return false;
      }
      return true;
    },
    stop: () => {
      setQueued(null);
      void controller.current?.stop();
    },
  };
}
