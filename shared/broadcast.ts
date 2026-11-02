export interface BroadcastAccess {
  configured: boolean;
  authorized: boolean;
}
export interface BroadcastTicket {
  url: string;
  token: string;
}
export type BroadcastStatus =
  "idle" | "preparing" | "connecting" | "live" | "stopping";
export type BroadcastEvent =
  | { type: "ready" }
  | { type: "live" }
  | { type: "ended" }
  | { type: "error"; message: string };
