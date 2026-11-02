import type { ChatMessage } from "../../shared/types.ts";
export function chatMessages(messages: ChatMessage[]) {
  return messages.filter(
    (message) => message.source === "chat" || message.source === "simulation",
  );
}
