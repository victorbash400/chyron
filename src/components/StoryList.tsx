import { useState } from "react";
import { Archive, Sparkles } from "lucide-react";
import type { Story } from "../../shared/types.ts";
import { sortedStories } from "../../server/ranking.ts";
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
  const shown = sortedStories(
    stories.filter((story) => story.dismissed === dismissed),
  ).sort((a, b) => Number(b.published) - Number(a.published));
  return (
    <section
      className="workspace-panel story-list-panel"
      aria-label="Newsroom stories"
    >
      <div className="panel-heading">
        <h2>{dismissed ? "Dismissed" : "Stories"}</h2>
        <span className="count-badge">{shown.length}</span>
        <div className="story-list-tools">
          <button
            className="icon-button"
            aria-label={dismissed ? "Show stories" : "Show dismissed stories"}
            aria-pressed={dismissed}
            onClick={() => setDismissed(!dismissed)}
          >
            <Archive />
          </button>
          <button
            className={`icon-button ${working ? "is-working" : ""}`}
            aria-label={working ? "Generating coverage" : "Generate coverage"}
            disabled={busy || working || !canGenerate}
            onClick={onGenerate}
          >
            <Sparkles />
          </button>
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
