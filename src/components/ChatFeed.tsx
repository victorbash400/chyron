import { useEffect, useRef } from "react";
import type { NewsroomState } from "../../shared/types.ts";
import ChatMessageRow from "./ChatMessageRow.tsx";
import SimulationControls from "./SimulationControls.tsx";
import AudioCapture from "./AudioCapture.tsx";
import "./ChatFeed.css";
export default function ChatFeed({
  state,
  busy,
  onScenario,
  onMessage,
  onError,
}: {
  state: NewsroomState;
  busy: boolean;
  onScenario: (scenario: string) => void;
  onMessage: (author: string, text: string) => Promise<boolean>;
  onError: (message: string) => void;
}) {
  const scroll = useRef<HTMLDivElement>(null),
    follow = useRef(true);
  useEffect(() => {
    if (follow.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [state.messages]);
  return (
    <section className="chat-feed">
      <div className="region-heading">
        <h2>{state.mode === "simulation" ? "Simulation chat" : "Chat"}</h2>
        <span>{state.messages.length} messages</span>
      </div>
      <div
        className="chat-feed-scroll"
        ref={scroll}
        onScroll={() => {
          const el = scroll.current!;
          follow.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 50;
        }}
      >
        {state.messages.map((message) => (
          <ChatMessageRow key={message.id} message={message} />
        ))}
      </div>
      {state.mode === "simulation" && (
        <SimulationControls
          busy={busy || state.paused}
          onScenario={onScenario}
          onMessage={onMessage}
        />
      )}
      <AudioCapture disabled={state.paused} onError={onError} />
    </section>
  );
}
