import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { SimulatorRequest } from "../../shared/simulator.ts";
import {
  chatScriptSchema,
  generateChatScript,
  chatScriptContext,
} from "../chatScript.ts";
import { configuredCoverageModel } from "../coverageSettings.ts";
import { appendMessage, changeRoom } from "./rooms.ts";
import { publishRoom } from "./realtime.ts";
import { analyzeRoom } from "./coverage.ts";
import { HttpError } from "./http.ts";
export async function startSimulation(
  userId: string,
  settings: SimulatorRequest,
) {
  configuredCoverageModel(settings.model);
  const id = randomUUID();
  const context = await changeRoom(userId, (room) => {
    if (room.state.mode !== "simulation")
      throw new HttpError(409, "Select Simulation first.");
    if (room.state.paused) throw new HttpError(409, "Resume coverage first.");
    if (room.state.simulator.status !== "idle")
      throw new HttpError(409, "Stop the current simulation first.");
    if (
      (settings.sourceId && settings.sourceId !== room.state.sourceId) ||
      (settings.previousBatchId &&
        settings.previousBatchId !== room.state.simulator.batchId)
    )
      throw new HttpError(409, "Demo chat changed. Start again.");
    room.simulationId = id;
    room.state.error = null;
    room.state.simulator = {
      batchId: id,
      status: "generating",
      total: settings.messages,
      delivered: 0,
    };
  });
  await publishRoom(userId);
  return async () => {
    const analyses = new Set<Promise<void>>();
    try {
      const recent = chatScriptContext(context.state.messages, settings.users);
      const script = chatScriptSchema(settings, recent.users).parse(
        await generateChatScript(settings, AbortSignal.timeout(45000), recent),
      );
      for (let index = 0; index < script.messages.length; index++) {
        if (index) await delay(settings.intervalMs);
        const message = script.messages[index];
        const added = await appendMessage(
          userId,
          context,
          {
            id: randomUUID(),
            userId: `sim-${script.users[message.user]}`,
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
