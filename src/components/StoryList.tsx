import { useMemo, useState } from "react";
import { Archive, LoaderCircle } from "lucide-react";
import type { Story } from "../../shared/types.ts";
import { sortedStories } from "../../server/ranking.ts";
import IconButton from "./controls/IconButton.tsx";
import DismissedStory from "./DismissedStory.tsx";
import StoryCard from "./StoryCard.tsx";
import "./StoryList.css";
export default function StoryList({
  stories,
  busy,
  working,
  onAction,
  onEvidence,
}: {
  stories: Story[];
  busy: boolean;
  working: boolean;
  onAction: (id: string, action: string) => void;
  onEvidence: (story: Story) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const shown = useMemo(
    () =>
      sortedStories(stories.filter((story) => story.dismissed === dismissed)),
    [stories, dismissed],
  );
  return (
    <section
      className="workspace-panel story-list-panel"
      aria-label="Chyron updates"
    >
      <div className="panel-heading">
        <h2>{dismissed ? "Dismissed" : "Updates"}</h2>
        <div className="story-list-tools">
          <IconButton
            label={dismissed ? "Show updates" : "Show dismissed updates"}
            selected={dismissed}
            onClick={() => setDismissed(!dismissed)}
          >
            <Archive />
          </IconButton>
          {working && (
            <LoaderCircle
              className="coverage-working"
              role="status"
              aria-label="Updating coverage"
            />
          )}
        </div>
      </div>
      <div className="story-list">
        {shown.map((story) =>
          dismissed ? (
            <DismissedStory
              key={story.id}
              story={story}
              busy={busy}
              onRestore={() => onAction(story.id, "restore")}
            />
          ) : (
            <StoryCard
              key={story.id}
              story={story}
              busy={busy}
              onDismiss={() => onAction(story.id, "dismiss")}
              onEvidence={() => onEvidence(story)}
            />
          ),
        )}
      </div>
    </section>
  );
}
