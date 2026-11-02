import type { CSSProperties } from "react";
import type { ChatMessage } from "../../shared/types.ts";
import { authorColor } from "../lib/authorColor.ts";
import "./PreviewChatMessage.css";

export default function PreviewChatMessage({
  message,
}: {
  message: ChatMessage;
}) {
  return (
    <div
      className="preview-chat-message"
      style={{ "--chat-author": authorColor(message.userId) } as CSSProperties}
    >
      <span className="preview-chat-author">{message.author}</span>
      <span className="preview-chat-text">{message.text}</span>
    </div>
  );
}
