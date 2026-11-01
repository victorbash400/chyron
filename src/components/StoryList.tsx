import { useMemo, useState } from "react";
import { Archive, RefreshCw } from "lucide-react";
import type { Story } from "../../shared/types.ts";
import { sortedStories } from "../../server/ranking.ts";
import IconButton from "./controls/IconButton.tsx";
import StoryCard from "./StoryCard.tsx";
import "./StoryList.css";
export default function StoryList({
  stories,
  busy,
  working,
  canGenerate,
  onAction,
  onEdit,
  onEvidence,
  onGenerate,
}: {
  stories: Story[];
  busy: boolean;
  working: boolean;
  canGenerate: boolean;
  onAction: (id: string, action: string) => void;
  onEdit: (story: Story) => void;
  onEvidence: (story: Story) => void;
  onGenerate: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const shown = useMemo(
    () =>
      sortedStories(
        stories.filter((story) => story.dismissed === dismissed),
      ).sort((a, b) => Number(b.published) - Number(a.published)),
    [stories, dismissed],
  );
  return (
    <section
      className="workspace-panel story-list-panel"
      aria-label="Newsroom stories"
    >
      <div className="panel-heading">
        <h2>{dismissed ? "Dismissed" : "Stories"}</h2>
        <span className="count-badge">{shown.length}</span>
        <div className="story-list-tools">
          <IconButton
            label={dismissed ? "Show stories" : "Show dismissed stories"}
            selected={dismissed}
            onClick={() => setDismissed(!dismissed)}
          >
            <Archive />
          </IconButton>
          <IconButton
            className={working ? "is-working" : ""}
            label={working ? "Generating coverage" : "Generate coverage"}
            disabled={busy || working || !canGenerate}
            onClick={onGenerate}
          >
            <RefreshCw />
          </IconButton>
        </div>
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
    </section>
  );
}
