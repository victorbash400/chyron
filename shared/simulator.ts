export interface SimulatorSettings {
  topic: string;
  users: 3 | 5 | 8;
  messages: 12 | 24;
  intervalMs: 500 | 1500 | 3000;
  model: "fast" | "reasoning";
}
export const defaultSimulatorSettings: SimulatorSettings = {
  topic: "",
  users: 3,
  messages: 12,
  intervalMs: 1500,
  model: "fast",
};

export interface SimulatorRequest extends SimulatorSettings {
  sourceId?: string;
  previousBatchId?: string;
}
