export interface CoverageSettings {
  focus: "headlines" | "recap" | "developments";
  newsworthiness: "all" | "notable" | "major";
  instructions: string;
  updateDelayMs: 0 | 800 | 1800 | 4000;
  minimumMessages: 1 | 3 | 5;
  model: "reasoning" | "fast";
  summary: "off" | "brief" | "standard";
  tone: "neutral" | "playful";
  maxStories: 1 | 3 | 5;
  minimumParticipants: 1 | 2 | 3 | 5;
  contextSeconds: 60 | 180 | 300;
  lifetimeSeconds: 60 | 300 | 600;
  includeChat: boolean;
  includeAudio: boolean;
  quotes: boolean;
}
export const defaultCoverageSettings: CoverageSettings = {
  focus: "headlines",
  newsworthiness: "notable",
  instructions: "",
  updateDelayMs: 800,
  minimumMessages: 3,
  model: "reasoning",
  summary: "standard",
  tone: "playful",
  maxStories: 5,
  minimumParticipants: 2,
  contextSeconds: 180,
  lifetimeSeconds: 300,
  includeChat: true,
  includeAudio: true,
  quotes: true,
};
export const summaryLimits = { off: 0, brief: 100, standard: 180 } as const;
export interface CoverageModelOption {
  value: CoverageSettings["model"];
  label: string;
}
