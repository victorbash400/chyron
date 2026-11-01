import { useState } from "react";
import type { Story } from "../../shared/types.ts";
import { sortedStories } from "../../server/ranking.ts";
import StoryCard from "./StoryCard.tsx";
import "./StoryList.css";
export default function StoryList({
  stories,
  busy,
  onAction,
  onEdit,
  onEvidence,
}: {
  stories: Story[];
  busy: boolean;
  onAction: (id: string, action: string) => void;
  onEdit: (story: Story) => void;
  onEvidence: (story: Story) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const shown = sortedStories(stories.filter((s) => s.dismissed === dismissed));
  return (
    <>
      <div className="story-list-tabs" role="group" aria-label="Stories">
        <button aria-pressed={!dismissed} onClick={() => setDismissed(false)}>
          Stories <span>{stories.filter((s) => !s.dismissed).length}</span>
        </button>
        <button aria-pressed={dismissed} onClick={() => setDismissed(true)}>
          Dismissed <span>{stories.filter((s) => s.dismissed).length}</span>
        </button>
      </div>
      <div className="story-list">
        {shown.map((story) =>
          dismissed ? (
            <article className="dismissed-story" key={story.id}>
              <span>{story.headline}</span>
              <button
                onClick={() => onAction(story.id, "restore")}
                disabled={busy}
              >
                Restore
              </button>
            </article>
          ) : (
            <StoryCard
              key={story.id}
              story={story}
              busy={busy}
              onAction={(action) => onAction(story.id, action)}
              onEdit={() => onEdit(story)}
              onEvidence={() => onEvidence(story)}
            />
          ),
        )}
      </div>
    </>
  );
}
