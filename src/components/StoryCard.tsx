import type { Story } from "../../shared/types.ts";
import StoryActions from "./StoryActions.tsx";
import "./StoryCard.css";
export default function StoryCard({
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
    <article className={`story-card ${story.published ? "is-published" : ""}`}>
      <button className="story-title" onClick={onEvidence}>
        {story.published && <span className="story-status">PUBLISHED</span>}
        <h3>{story.headline}</h3>
      </button>
      <StoryActions
        story={story}
        busy={busy}
        onAction={onAction}
        onEdit={onEdit}
        onEvidence={onEvidence}
      />
    </article>
  );
}
