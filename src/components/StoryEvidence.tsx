import type { ChatMessage, Story } from "../../shared/types.ts";
import Dialog from "./Dialog.tsx";
import ChatMessageRow from "./ChatMessageRow.tsx";
import "./StoryEvidence.css";
export default function StoryEvidence({
  story,
  messages,
  onClose,
}: {
  story: Story;
  messages: ChatMessage[];
  onClose: () => void;
}) {
  return (
    <Dialog title="Source messages" onClose={onClose}>
      <div className="story-evidence">
        <h3>{story.headline}</h3>
        {messages
          .filter((m) => story.messageIds.includes(m.id))
          .map((message) => (
            <ChatMessageRow key={message.id} message={message} />
          ))}
      </div>
    </Dialog>
  );
}
