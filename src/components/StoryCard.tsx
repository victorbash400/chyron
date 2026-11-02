import { X } from "lucide-react";
import type { Story } from "../../shared/types.ts";
import IconButton from "./controls/IconButton.tsx";
import "./StoryCard.css";
export default function StoryCard({
  story,
  busy,
  onDismiss,
  onEvidence,
}: {
  story: Story;
  busy: boolean;
  onDismiss: () => void;
  onEvidence: () => void;
}) {
  return (
    <article className="story-card">
      <button
        className="story-title"
        aria-label={`Source messages: ${story.headline}`}
        onClick={onEvidence}
      >
        <h3>{story.headline}</h3>
      </button>
      <IconButton label="Dismiss story" disabled={busy} onClick={onDismiss}>
        <X />
      </IconButton>
    </article>
  );
}
