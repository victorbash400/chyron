import { useEffect, useRef, useState } from "react";
import type { NewsroomState } from "../../shared/types.ts";
import type { SimulatorSettings } from "../../shared/simulator.ts";
import { DemoChat } from "./demoChat.ts";

export function useDemoChat(
  state: NewsroomState | undefined,
  online: boolean,
  act: (path: string, body?: unknown) => Promise<boolean>,
) {
  const [active, setActive] = useState(false);
  const controller = useRef<DemoChat | null>(null);
  useEffect(() => {
    const demo = new DemoChat(act, setActive);
    controller.current = demo;
    return () => demo.dispose();
  }, [act]);
  useEffect(() => {
    if (state) controller.current?.observe(state, online);
  }, [state, online]);
  return {
    active,
    start: (settings: SimulatorSettings) =>
      state && controller.current
        ? controller.current.start(state, settings)
        : Promise.resolve(false),
    stop: () => void controller.current?.stop(),
  };
}
