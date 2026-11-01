import type { ChatMessage } from "../../shared/types.ts";
import "./ChatMessageRow.css";
export default function ChatMessageRow({ message }: { message: ChatMessage }) {
  return (
    <article className="chat-message">
      <div>
        <span className="chat-author">{message.author}</span>
        {message.source === "audio" && (
          <span className="message-source">Audio</span>
        )}
        <time dateTime={new Date(message.at).toISOString()}>
          {new Date(message.at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
      <p>{message.text}</p>
    </article>
  );
}
