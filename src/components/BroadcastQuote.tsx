import type { ChatMessage } from "../../shared/types.ts";
import "./BroadcastQuote.css";
export default function BroadcastQuote({ message }: { message: ChatMessage }) {
  return (
    <div className="broadcast-quote">
      <span>“{message.text}”</span>
      <strong>@{message.author}</strong>
    </div>
  );
}
