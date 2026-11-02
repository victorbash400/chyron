export interface StreamerAccount {
  id: string;
  name: string;
  login?: string;
  avatarUrl?: string;
}
export interface SessionStatus {
  account: StreamerAccount | null;
  canSignIn: boolean;
  local?: boolean;
}
export interface RealtimeConnection {
  url: string;
  host: string;
  channel: string;
  token: string;
}
