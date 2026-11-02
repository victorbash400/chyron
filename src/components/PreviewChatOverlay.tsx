import type { ChatMessage } from "../../shared/types.ts";
import PreviewChatMessage from "./PreviewChatMessage.tsx";
import "./PreviewChatOverlay.css";

export default function PreviewChatOverlay({
  messages,
}: {
  messages: ChatMessage[];
}) {
  if (!messages.length) return null;
  return (
    <div className="preview-chat-overlay" aria-label="Video chat overlay">
      <span className="preview-chat-heading">Chat</span>
      <div className="preview-chat-messages">
        {messages.map((message) => (
          <PreviewChatMessage key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}
