import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { NewsroomState } from "../../shared/types.ts";
import { overlayState } from "../../server/ranking.ts";
import BroadcastOverlay from "./BroadcastOverlay.tsx";
import "./OverlayPreview.css";
export default function OverlayPreview({
  state,
  url,
  onError,
}: {
  state: NewsroomState;
  url: string;
  onError: (error: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      onError(
        "Could not copy overlay URL. Open the overlay and copy its address.",
      );
    }
  }
  return (
    <section className="overlay-preview">
      <div className="region-heading">
        <h2>Preview</h2>
        <span>{state.visible ? "1920 × 1080" : "Hidden"}</span>
        <button
          className="icon-button"
          aria-label={copied ? "Overlay URL copied" : "Copy overlay URL"}
          onClick={() => void copy()}
        >
          {copied ? <Check /> : <Copy />}
        </button>
        <a
          className="icon-button"
          aria-label="Open overlay"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink />
        </a>
      </div>
      <div className="preview-canvas">
        <BroadcastOverlay state={overlayState(state)} />
      </div>
    </section>
  );
}
