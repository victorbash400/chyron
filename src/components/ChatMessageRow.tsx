import type { ChatMessage } from "../../shared/types.ts";
import AuthorAvatar, { authorColor } from "./AuthorAvatar.tsx";
import "./ChatMessageRow.css";
export default function ChatMessageRow({ message }: { message: ChatMessage }) {
  return (
    <article className="chat-message">
      <AuthorAvatar id={message.userId} name={message.author} />
      <div className="chat-message-content">
        <span
          className="chat-author"
          style={{ color: authorColor(message.userId) }}
        >
          {message.author}
        </span>
        {message.source === "audio" && (
          <span className="message-source">Audio</span>
        )}
        <span className="chat-message-text">{message.text}</span>
      </div>
      <time dateTime={new Date(message.at).toISOString()}>
        {new Date(message.at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </time>
    </article>
  );
}
