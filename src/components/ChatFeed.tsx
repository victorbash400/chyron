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
    <section className="workspace-panel chat-feed">
      <div className="panel-heading">
        <h2>{state.mode === "simulation" ? "Simulation chat" : "Chat"}</h2>
        <span className="count-badge">{state.messages.length}</span>
      </div>
      <div
        className="chat-feed-scroll"
        ref={scroll}
        onScroll={() => {
          const element = scroll.current!;
          follow.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            50;
        }}
      >
        {state.messages.map((message) => (
          <ChatMessageRow key={message.id} message={message} />
        ))}
      </div>
      <div className="chat-feed-controls">
        {state.mode === "simulation" && (
          <SimulationControls
            busy={busy || state.paused}
            onScenario={onScenario}
            onMessage={onMessage}
          />
        )}
        <AudioCapture disabled={state.paused} onError={onError} />
      </div>
    </section>
  );
}
