import type { Story } from "../../shared/types.ts";
import "./BroadcastScoreboard.css";
export default function BroadcastScoreboard({ story }: { story: Story }) {
  return (
    <div className="broadcast-scoreboard">
      <div className="scoreboard-metric">
        <span>VIEWERS</span>
        <strong>{story.participants}</strong>
      </div>
      <span className="scoreboard-headline">{story.headline}</span>
      <div className="scoreboard-metric">
        <strong>{story.messageIds.length}</strong>
        <span>MESSAGES</span>
      </div>
    </div>
  );
}
