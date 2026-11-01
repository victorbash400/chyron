import { z } from "zod";
import type {
  CoverageModelOption,
  CoverageSettings,
} from "../shared/coverageSettings.ts";
import { required } from "./config.ts";
export const coverageSettingsSchema = z.object({
  focus: z.enum(["headlines", "recap", "developments"]),
  newsworthiness: z.enum(["all", "notable", "major"]),
  instructions: z.string().trim().max(600),
  generation: z.enum(["automatic", "manual"]),
  updateDelayMs: z.union([
    z.literal(0),
    z.literal(800),
    z.literal(1800),
    z.literal(4000),
  ]),
  minimumMessages: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  model: z.enum(["reasoning", "fast"]),
  summary: z.enum(["off", "brief", "standard"]),
  tone: z.enum(["neutral", "playful"]),
  maxStories: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  minimumParticipants: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(5),
  ]),
  contextSeconds: z.union([z.literal(60), z.literal(180), z.literal(300)]),
  lifetimeSeconds: z.union([z.literal(60), z.literal(300), z.literal(600)]),
  includeAudio: z.boolean(),
  audioStories: z.boolean(),
  quotes: z.boolean(),
});
export function configuredCoverageModel(model: CoverageSettings["model"]) {
  return required(
    model === "fast" ? "BEDROCK_MODEL_ID" : "BEDROCK_REASONING_MODEL_ID",
  );
}
export function coverageModelOptions(): CoverageModelOption[] {
  const options: CoverageModelOption[] = [];
  if (process.env.BEDROCK_REASONING_MODEL_ID)
    options.push({
      value: "reasoning",
      label: process.env.BEDROCK_REASONING_MODEL_ID,
    });
  if (process.env.BEDROCK_MODEL_ID)
    options.push({ value: "fast", label: process.env.BEDROCK_MODEL_ID });
  return options;
}
