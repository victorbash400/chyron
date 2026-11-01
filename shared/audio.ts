export type TranscriptResult =
  | { status: "speech"; transcript: string }
  | { status: "silence" | "uncertain"; transcript: "" };
