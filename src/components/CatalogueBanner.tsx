import { MessageSquareMore } from "lucide-react";
import type { Story } from "../../shared/types.ts";
import "./CatalogueBanner.css";
export default function CatalogueBanner({ story }: { story: Story }) {
  return (
    <div className="catalogue-banner">
      <span className="catalogue-mark" aria-hidden="true">
        <MessageSquareMore />
        <span>{story.status}</span>
      </span>
      <div className="catalogue-copy">
        <span className="catalogue-eyebrow">
          Chat summary <span>{story.status}</span>
        </span>
        <span className="catalogue-headline">{story.headline}</span>
      </div>
    </div>
  );
}
