import type { ChatMessage } from "../../shared/types.ts";

const samples: ChatMessage[] = [
  {
    id: "preview-chat-1",
    userId: "preview-viewer-1",
    author: "viewer_one",
    text: "The stealth route looks safer.",
    at: 0,
    source: "chat",
  },
  {
    id: "preview-chat-2",
    userId: "preview-viewer-2",
    author: "viewer_two",
    text: "Save the next upgrade for the boss.",
    at: 0,
    source: "chat",
  },
  {
    id: "preview-chat-3",
    userId: "preview-viewer-3",
    author: "viewer_three",
    text: "That build could work.",
    at: 0,
    source: "chat",
  },
];

export function previewChat(messages: ChatMessage[], allowSample: boolean) {
  const chat = messages
    .filter((message) => message.source !== "audio")
    .slice(-5);
  return chat.length || !allowSample
    ? { kind: "live" as const, messages: chat }
    : { kind: "sample" as const, messages: samples };
}
