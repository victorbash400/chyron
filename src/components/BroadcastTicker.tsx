import type { Story } from "../../shared/types.ts";
import "./BroadcastTicker.css";
export default function BroadcastTicker({ stories }: { stories: Story[] }) {
  if (!stories.length) return null;
  return (
    <div className="broadcast-ticker">
      <span className="ticker-label">CHYRON.</span>
      <div className="ticker-window">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div className="ticker-items" key={copy} aria-hidden={copy === 1}>
              {stories.map((story) => (
                <span key={story.id}>{story.headline}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
