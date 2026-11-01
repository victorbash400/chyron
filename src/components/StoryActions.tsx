import { ArrowUpRight, Check, Pencil, Pin, X } from "lucide-react";
import type { Story } from "../../shared/types.ts";
import "./StoryActions.css";
export default function StoryActions({
  story,
  busy,
  onAction,
  onEdit,
  onEvidence,
}: {
  story: Story;
  busy: boolean;
  onAction: (action: string) => void;
  onEdit: () => void;
  onEvidence: () => void;
}) {
  return (
    <div className="story-actions">
      <button
        className={`publish-action ${story.published ? "is-published" : ""}`}
        onClick={() => onAction(story.published ? "unpublish" : "publish")}
        disabled={busy}
      >
        {story.published ? <Check /> : <ArrowUpRight />}
        {story.published ? "On air" : "Publish"}
      </button>
      <button className="evidence-action" onClick={onEvidence}>
        {story.participants} viewers
      </button>
      <span className="action-spacer" />
      <button
        className="icon-button"
        aria-label={story.pinned ? "Unpin story" : "Pin story"}
        aria-pressed={story.pinned}
        onClick={() => onAction("pin")}
        disabled={busy}
      >
        <Pin />
      </button>
      <button className="icon-button" aria-label="Edit story" onClick={onEdit}>
        <Pencil />
      </button>
      <button
        className="icon-button"
        aria-label="Dismiss story"
        onClick={() => onAction("dismiss")}
        disabled={busy}
      >
        <X />
      </button>
    </div>
  );
}
