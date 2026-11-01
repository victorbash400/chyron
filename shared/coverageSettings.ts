export interface CoverageSettings {
  model: "reasoning" | "fast";
  summary: "off" | "brief" | "standard";
  tone: "neutral" | "playful";
  maxStories: 1 | 3 | 5;
  minimumParticipants: 1 | 2 | 3 | 5;
  contextSeconds: 60 | 180 | 300;
  lifetimeSeconds: 60 | 300 | 600;
  includeAudio: boolean;
  quotes: boolean;
}
export const defaultCoverageSettings: CoverageSettings = {
  model: "reasoning",
  summary: "standard",
  tone: "playful",
  maxStories: 5,
  minimumParticipants: 2,
  contextSeconds: 180,
  lifetimeSeconds: 300,
  includeAudio: true,
  quotes: true,
};
export const summaryLimits = { off: 0, brief: 100, standard: 180 } as const;
export interface CoverageModelOption {
  value: CoverageSettings["model"];
  label: string;
}
