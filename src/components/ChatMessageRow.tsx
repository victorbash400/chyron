import { memo } from "react";
import type { ChatMessage } from "../../shared/types.ts";
import { authorColor } from "../lib/authorColor.ts";
import "./ChatMessageRow.css";
function ChatMessageRow({
  message,
  timestamps = false,
}: {
  message: ChatMessage;
  timestamps?: boolean;
}) {
  return (
    <article className="chat-message">
      {timestamps && (
        <time dateTime={new Date(message.at).toISOString()}>
          {new Date(message.at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </time>
      )}{" "}
      <span
        className="chat-author"
        style={{ color: authorColor(message.userId) }}
      >
        {message.author}
      </span>
      {": "}
      {message.source === "audio" && (
        <span className="message-source">Audio</span>
      )}
      <span className="chat-message-text">{message.text}</span>
    </article>
  );
}
export default memo(ChatMessageRow, (previous, next) => {
  const a = previous.message,
    b = next.message;
  return (
    previous.timestamps === next.timestamps &&
    a.id === b.id &&
    a.author === b.author &&
    a.userId === b.userId &&
    a.text === b.text &&
    a.at === b.at &&
    a.source === b.source
  );
});
