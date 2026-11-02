import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  coverageSettingsSchema,
  configuredCoverageModel,
} from "../coverageSettings.ts";
import { overlayColors, overlayStyleIds } from "../../shared/overlayDesign.ts";
import { changeRoom, type RoomSnapshot } from "./rooms.ts";
import { HttpError } from "./http.ts";
export const settingsSchema = z
  .object({
    coverage: coverageSettingsSchema.partial().strict().optional(),
    paused: z.boolean().optional(),
    visible: z.boolean().optional(),
    design: z
      .object({
        style: z.enum(overlayStyleIds).optional(),
        color: z.enum(overlayColors).optional(),
        size: z.number().int().min(70).max(130).optional(),
        speed: z.number().int().min(10).max(70).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export async function updateSettings(userId: string, input: unknown) {
  const patch = settingsSchema.parse(input);
  if (patch.coverage?.model) configuredCoverageModel(patch.coverage.model);
  return changeRoom(userId, (room) => {
    if (patch.coverage && room.state.working)
      throw new HttpError(
        409,
        "Wait for coverage to finish before changing Chyron settings.",
      );
    if (patch.coverage) {
      room.state.coverage = { ...room.state.coverage, ...patch.coverage };
      room.state.model = configuredCoverageModel(room.state.coverage.model);
    }
    if (patch.design)
      room.state.design = { ...room.state.design, ...patch.design };
    if (patch.visible !== undefined) room.state.visible = patch.visible;
    if (patch.paused !== undefined) room.state.paused = patch.paused;
    if (patch.paused) {
      room.state.sourceId = randomUUID();
      room.simulationId = "";
      room.state.simulator.status = "idle";
    }
  });
}
export function resetSource(room: RoomSnapshot, mode: "twitch" | "simulation") {
  if (room.state.working)
    throw new HttpError(
      409,
      "Wait for coverage to finish before changing source.",
    );
  room.state.sourceId = randomUUID();
  room.conversationId = room.state.sourceId;
  room.state.mode = mode;
  room.state.messages = [];
  room.state.stories = [];
  room.state.error = null;
  room.simulationId = "";
  room.state.simulator = { status: "idle", delivered: 0, total: 0 };
  room.processed = room.received;
  room.lastAnalysisAt = 0;
}
