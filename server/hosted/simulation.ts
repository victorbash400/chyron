import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { SimulatorSettings } from "../../shared/simulator.ts";
import { chatScriptSchema, generateChatScript } from "../chatScript.ts";
import { configuredCoverageModel } from "../coverageSettings.ts";
import { appendMessage, changeRoom } from "./rooms.ts";
import { publishRoom } from "./realtime.ts";
import { analyzeRoom } from "./coverage.ts";
import { HttpError } from "./http.ts";
export async function startSimulation(
  userId: string,
  settings: SimulatorSettings,
) {
  configuredCoverageModel(settings.model);
  const id = randomUUID();
  const context = await changeRoom(userId, (room) => {
    if (room.state.mode !== "simulation")
      throw new HttpError(409, "Select Simulation first.");
    if (room.state.paused) throw new HttpError(409, "Resume coverage first.");
    if (room.state.simulator.status !== "idle")
      throw new HttpError(409, "Stop the current simulation first.");
    room.simulationId = id;
    room.state.error = null;
    room.state.simulator = {
      status: "generating",
      total: settings.messages,
      delivered: 0,
    };
  });
  await publishRoom(userId);
  return async () => {
    const analyses = new Set<Promise<void>>();
    try {
      const script = chatScriptSchema(settings).parse(
        await generateChatScript(settings, AbortSignal.timeout(45000)),
      );
      for (let index = 0; index < script.messages.length; index++) {
        if (index) await delay(settings.intervalMs);
        const message = script.messages[index];
        const added = await appendMessage(
          userId,
          context,
          {
            id: randomUUID(),
            userId: `sim-${id}-${message.user}`,
            author: script.users[message.user],
            text: message.text,
            at: Date.now(),
            source: "simulation",
          },
          { id, delivered: index + 1, total: script.messages.length },
        );
        if (!added) break;
        await publishRoom(userId);
        const analysis = analyzeRoom(userId);
        analyses.add(analysis);
        void analysis.finally(() => analyses.delete(analysis)).catch(() => {});
      }
    } catch (error) {
      await changeRoom(userId, (room) => {
        if (room.simulationId !== id) return;
        room.state.simulator.status = "idle";
        room.state.error =
          error instanceof Error
            ? error.message
            : "Simulation failed. Generate again.";
      });
      await publishRoom(userId);
    } finally {
      const results = await Promise.allSettled(analyses);
      for (const result of results)
        if (result.status === "rejected") throw result.reason;
    }
  };
}
