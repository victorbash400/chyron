import { useRef, useState, type FormEvent } from "react";
import { ArrowUp, AtSign } from "lucide-react";
import "./SimulationComposer.css";

export default function SimulationComposer({
  busy,
  onMessage,
}: {
  busy: boolean;
  onMessage: (author: string, text: string) => Promise<boolean>;
}) {
  const messageInput = useRef<HTMLTextAreaElement>(null);
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
      messageInput.current?.focus();
    }
  }
  return (
    <form
      className="simulation-composer"
      onSubmit={(event) => void send(event)}
    >
      <label className="simulation-author-field">
        <AtSign aria-hidden="true" />
        <input
          className="simulation-author"
          aria-label="Simulation username"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          required
          maxLength={30}
          readOnly={busy || sending}
        />
      </label>
      <div className="simulation-message-input">
        <textarea
          ref={messageInput}
          rows={1}
          aria-label="Simulation message"
          placeholder="Send a message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
          maxLength={500}
          readOnly={busy || sending}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (busy || sending || !text.trim() || !author.trim()) return;
              event.currentTarget.form?.requestSubmit();
            }
          }}
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
