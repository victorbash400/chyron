import { Expand, Shrink, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { NewsroomState } from "../../shared/types.ts";
import type { OverlayDesign } from "../../shared/overlayDesign.ts";
import { previewCoverage } from "../state/previewCoverage.ts";
import { usePreviewVideo } from "../state/usePreviewVideo.ts";
import BroadcastOverlay from "./BroadcastOverlay.tsx";
import PreviewVideo from "./PreviewVideo.tsx";
import PreviewSourceMenu from "./PreviewSourceMenu.tsx";
import NewsroomControls from "./NewsroomControls.tsx";
import "./OverlayPreview.css";
export default function OverlayPreview({
  state,
  url,
  busy,
  onSettings,
  onDesign,
  onError,
}: {
  state: NewsroomState;
  url: string;
  busy: boolean;
  onSettings: (patch: {
    automatic?: boolean;
    paused?: boolean;
    visible?: boolean;
  }) => void;
  onDesign: (patch: Partial<OverlayDesign>) => void;
  onError: (error: string) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const video = usePreviewVideo(onError),
    preview = previewCoverage(state);
  useEffect(() => {
    const change = () =>
      setExpanded(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch {
      onError("Fullscreen preview is unavailable. Open the overlay instead.");
    }
  }
  return (
    <section className="workspace-panel overlay-preview" ref={root}>
      <div className="panel-heading">
        <h2>Preview</h2>
        {preview.draft && <span className="draft-label">Draft</span>}
        <div className="preview-actions">
          <PreviewSourceMenu
            active={Boolean(video.stream)}
            disabled={video.opening}
            onSelect={(source) => void video.start(source)}
            onRemove={video.stop}
          />
          <button
            className="icon-button"
            aria-label={state.visible ? "Hide overlay" : "Show overlay"}
            disabled={busy}
            onClick={() => onSettings({ visible: !state.visible })}
          >
            {state.visible ? <Eye /> : <EyeOff />}
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
          <button
            className="icon-button"
            aria-label={expanded ? "Minimize preview" : "Expand preview"}
            onClick={() => void fullscreen()}
          >
            {expanded ? <Shrink /> : <Expand />}
          </button>
        </div>
      </div>
      <div className="preview-canvas">
        {video.stream && <PreviewVideo stream={video.stream} />}
        <BroadcastOverlay state={preview.coverage} />
      </div>
      <NewsroomControls
        state={state}
        url={url}
        busy={busy}
        onSettings={onSettings}
        onDesign={onDesign}
        onError={onError}
      />
    </section>
  );
}
