import { useEffect, useMemo, useRef } from "react";
import type { NewsroomState } from "../../shared/types.ts";
import { chatMessages } from "../state/chatMessages.ts";
import ChatMessageRow from "./ChatMessageRow.tsx";
import SimulationComposer from "./SimulationComposer.tsx";
import "./ChatFeed.css";
export default function ChatFeed({
  state,
  open,
  onClose,
  busy,
  onMessage,
}: {
  open: boolean;
  onClose: () => void;
  state: NewsroomState;
  busy: boolean;
  onMessage: (author: string, text: string) => Promise<boolean>;
}) {
  const messages = useMemo(
    () => chatMessages(state.messages),
    [state.messages],
  );
  const lastMessageId = messages.at(-1)?.id;
  const scroll = useRef<HTMLDivElement>(null),
    follow = useRef(true);
  useEffect(() => {
    if (open && follow.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [lastMessageId, open]);
  return (
    <section className="chat-feed" hidden={!open} aria-label="Chat">
      <div
        className="chat-feed-scroll"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions text"
        ref={scroll}
        onScroll={() => {
          const element = scroll.current!;
          follow.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            50;
        }}
      >
        {messages.map((message) => (
          <ChatMessageRow key={message.id} message={message} />
        ))}
      </div>
      <div className="chat-feed-controls">
        {state.mode === "simulation" && (
          <SimulationComposer
            busy={busy || state.paused}
            onMessage={async (author, text) => {
              const sent = await onMessage(author, text);
              if (sent) {
                follow.current = true;
                if (scroll.current)
                  scroll.current.scrollTop = scroll.current.scrollHeight;
              }
              return sent;
            }}
          />
        )}
      </div>
    </section>
  );
}
