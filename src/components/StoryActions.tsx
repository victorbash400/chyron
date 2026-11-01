import { MessageSquare, Pin, X } from "lucide-react";
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
        className="evidence-action"
        aria-label={`${story.participants} viewers, source messages`}
        onClick={onEvidence}
      >
        <MessageSquare />
        {story.participants}
      </button>
      <button className="edit-action" onClick={onEdit}>
        Edit
      </button>
      <button
        className={`publish-action ${story.published ? "is-published" : ""}`}
        onClick={() => onAction(story.published ? "unpublish" : "publish")}
        disabled={busy}
      >
        {story.published ? "Unpublish" : "Publish"}
      </button>
      <button
        className="icon-button pin-action"
        aria-label={story.pinned ? "Unpin story" : "Pin story"}
        aria-pressed={story.pinned}
        onClick={() => onAction("pin")}
        disabled={busy}
      >
        <Pin />
      </button>
      <button
        className="icon-button dismiss-action"
        aria-label="Dismiss story"
        onClick={() => onAction("dismiss")}
        disabled={busy}
      >
        <X />
      </button>
    </div>
  );
}
