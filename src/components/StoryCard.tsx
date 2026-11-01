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
    <article className="story-card">
      <div className="story-meta">
        <span
          className={`story-status ${story.status === "BREAKING" ? "is-breaking" : ""}`}
        >
          {story.status}
        </span>
        <time dateTime={new Date(story.updatedAt).toISOString()}>
          {new Date(story.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
        {story.edited && <span>Edited</span>}
      </div>
      <h2>{story.headline}</h2>
      {story.summary && <p>{story.summary}</p>}
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
