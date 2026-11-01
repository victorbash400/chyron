import { useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import "./SimulationControls.css";
export default function SimulationControls({
  busy,
  onScenario,
  onMessage,
}: {
  busy: boolean;
  onScenario: (scenario: string) => void;
  onMessage: (author: string, text: string) => Promise<boolean>;
}) {
  const [author, setAuthor] = useState("viewer"),
    [text, setText] = useState("");
  async function send(event: FormEvent) {
    event.preventDefault();
    if (await onMessage(author, text)) setText("");
  }
  return (
    <div className="simulation-controls">
      <div className="simulation-scenarios">
        <button disabled={busy} onClick={() => onScenario("keyboard")}>
          Keyboard debate
        </button>
        <button disabled={busy} onClick={() => onScenario("reversal")}>
          Plot twist
        </button>
      </div>
      <form onSubmit={(event) => void send(event)}>
        <input
          className="simulation-author"
          aria-label="Simulation username"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          required
          maxLength={30}
        />
        <input
          aria-label="Simulation message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
          maxLength={500}
          placeholder="Message"
        />
        <button
          type="submit"
          aria-label="Send simulation message"
          disabled={busy || !text.trim() || !author.trim()}
        >
          <ArrowUp />
        </button>
      </form>
    </div>
  );
}
