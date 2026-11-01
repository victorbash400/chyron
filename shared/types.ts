export type StoryStatus = "BREAKING" | "DEVELOPING" | "UPDATE";
export type SourceMode = "twitch" | "simulation";
export interface ChatMessage {
  id: string;
  userId: string;
  author: string;
  text: string;
  at: number;
  source: "chat" | "audio" | "simulation";
}
export interface Story {
  id: string;
  headline: string;
  summary: string;
  status: StoryStatus;
  messageIds: string[];
  quoteId: string | null;
  participants: number;
  score: number;
  interest: number;
  updatedAt: number;
  createdAt: number;
  published: boolean;
  pinned: boolean;
  dismissed: boolean;
  edited: boolean;
}
export interface NewsroomState {
  mode: SourceMode;
  channel: { id: string; name: string } | null;
  connection: "disconnected" | "connecting" | "connected" | "error";
  paused: boolean;
  automatic: boolean;
  visible: boolean;
  working: boolean;
  error: string | null;
  stories: Story[];
  messages: ChatMessage[];
  model: string;
  audioModel: string;
  revision: number;
}
export interface OverlayState {
  mode: SourceMode;
  visible: boolean;
  lead: Story | null;
  ticker: Story[];
  quote: ChatMessage | null;
}
export interface Bootstrap {
  state: NewsroomState;
  overlayUrl: string;
  twitchConfigured: boolean;
}
