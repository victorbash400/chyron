import type { Story } from "../../shared/types.ts";
import "./BroadcastBanner.css";
export default function BroadcastBanner({ story }: { story: Story }) {
  return (
    <div className="broadcast-banner">
      <span className="broadcast-kicker">{story.status}</span>
      <span className="broadcast-headline">{story.headline}</span>
    </div>
  );
}
