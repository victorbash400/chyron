import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { SimulatorSettings } from "../shared/simulator.ts";
import type { Newsroom } from "./newsroom.ts";
import { generateChatScript, chatScriptSchema } from "./chatScript.ts";
export class ChatSimulator {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private controller: AbortController | undefined;
  private run = 0;
  constructor(
    private room: Newsroom,
    private generate = generateChatScript,
  ) {
    room.on("source", () => this.stop(false));
    room.on("shutdown", () => this.stop(false));
  }
  stop(notify = true) {
    this.run++;
    clearTimeout(this.timer);
    this.controller?.abort();
    this.controller = undefined;
    this.room.state.simulator.status = "idle";
    if (notify) this.room.emitState();
  }
  async start(settings: SimulatorSettings) {
    if (this.room.state.mode !== "simulation")
      throw new Error("Select Simulation first.");
    if (this.room.state.paused)
      throw new Error("Resume coverage before starting the simulator.");
    if (this.room.state.simulator.status !== "idle")
      throw new Error("Stop the current simulation first.");
    const run = ++this.run,
      source = this.room.state.sourceId;
    this.controller = new AbortController();
    this.room.state.simulator = {
      status: "generating",
      total: settings.messages,
      delivered: 0,
    };
    this.room.emitState();
    try {
      const script = chatScriptSchema(settings).parse(
        await this.generate(settings, this.controller.signal),
      );
      if (run !== this.run || source !== this.room.state.sourceId) return;
      this.room.state.simulator.status = "running";
      let index = 0;
      const deliver = () => {
        if (
          run !== this.run ||
          source !== this.room.state.sourceId ||
          this.room.state.mode !== "simulation"
        )
          return;
        if (this.room.state.paused) {
          this.stop();
          return;
        }
        const message = script.messages[index]!;
        this.room.state.simulator.delivered = ++index;
        if (index === script.messages.length)
          this.room.state.simulator.status = "idle";
        const author = script.users[message.user]!;
        this.room.add([
          {
            id: randomUUID(),
            userId: `sim-${run}-${message.user}`,
            author,
            text: message.text,
            at: Date.now(),
            source: "simulation",
          },
        ]);
        if (index < script.messages.length)
          this.timer = setTimeout(deliver, settings.intervalMs);
      };
      deliver();
    } catch (error) {
      if (run !== this.run) return;
      this.room.state.simulator.status = "idle";
      this.room.emitState();
      throw error instanceof z.ZodError
        ? new Error("Simulator output was invalid. Generate again.")
        : error;
    }
  }
}
