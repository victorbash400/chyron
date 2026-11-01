import { useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import "./SimulationComposer.css";

export default function SimulationComposer({
  busy,
  onMessage,
}: {
  busy: boolean;
  onMessage: (author: string, text: string) => Promise<boolean>;
}) {
  const [author, setAuthor] = useState("viewer");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (busy || sending || !author.trim() || !text.trim()) return;
    setSending(true);
    try {
      if (await onMessage(author, text)) setText("");
    } finally {
      setSending(false);
    }
  }
  return (
    <form
      className="simulation-composer"
      onSubmit={(event) => void send(event)}
    >
      <input
        className="simulation-author"
        aria-label="Simulation username"
        value={author}
        onChange={(event) => setAuthor(event.target.value)}
        required
        maxLength={30}
        disabled={busy || sending}
      />
      <div className="simulation-message-input">
        <input
          aria-label="Simulation message"
          placeholder="Send a message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
          maxLength={500}
          disabled={busy || sending}
        />
        <button
          type="submit"
          aria-label="Send simulation message"
          disabled={busy || sending || !text.trim() || !author.trim()}
        >
          <ArrowUp />
        </button>
      </div>
    </form>
  );
}
