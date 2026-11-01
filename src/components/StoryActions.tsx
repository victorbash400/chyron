import { MessageSquare, Pin, X } from "lucide-react";
import type { Story } from "../../shared/types.ts";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import IconButton from "./controls/IconButton.tsx";
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
      <SettingsInlineButton className="edit-action" onClick={onEdit}>
        Edit
      </SettingsInlineButton>
      <SettingsInlineButton
        primary={!story.published}
        className={`publish-action ${story.published ? "is-published" : ""}`}
        onClick={() => onAction(story.published ? "unpublish" : "publish")}
        disabled={busy}
      >
        {story.published ? "Unpublish" : "Publish"}
      </SettingsInlineButton>
      <IconButton
        className="pin-action"
        label={story.pinned ? "Unpin story" : "Pin story"}
        selected={story.pinned}
        onClick={() => onAction("pin")}
        disabled={busy}
      >
        <Pin />
      </IconButton>
      <IconButton
        className="dismiss-action"
        label="Dismiss story"
        onClick={() => onAction("dismiss")}
        disabled={busy}
      >
        <X />
      </IconButton>
    </div>
  );
}
