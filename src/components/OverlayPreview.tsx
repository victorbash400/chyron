import { Eye, EyeOff, ExternalLink } from "lucide-react";
import type { NewsroomState } from "../../shared/types.ts";
import { previewCoverage } from "../state/previewCoverage.ts";
import { usePreviewVideo } from "../state/usePreviewVideo.ts";
import BroadcastOverlay from "./BroadcastOverlay.tsx";
import IconLink from "./controls/IconLink.tsx";
import IconButton from "./controls/IconButton.tsx";
import PreviewVideo from "./PreviewVideo.tsx";
import PreviewSourceMenu from "./PreviewSourceMenu.tsx";
import "./OverlayPreview.css";
export default function OverlayPreview({
  state,
  url,
  busy,
  onSettings,
  onError,
}: {
  state: NewsroomState;
  url: string;
  busy: boolean;
  onSettings: (patch: {
    paused?: boolean;
    visible?: boolean;
  }) => void;
  onError: (error: string) => void;
}) {
  const video = usePreviewVideo(onError),
    preview = previewCoverage(state);
  return (
    <section className="workspace-panel overlay-preview" aria-label="Preview">
      <div className="panel-heading">
        <h2>Preview</h2>
        {preview.kind === "sample" && (
          <span className="draft-label">
            Sample
          </span>
        )}
        <div className="preview-actions">
          <PreviewSourceMenu
            active={Boolean(video.stream)}
            disabled={video.opening}
            onSelect={(source) => void video.start(source)}
            onRemove={video.stop}
          />
          <IconButton
            label={state.visible ? "Hide overlay" : "Show overlay"}
            disabled={busy}
            onClick={() => onSettings({ visible: !state.visible })}
          >
            {state.visible ? <Eye /> : <EyeOff />}
          </IconButton>
          <IconLink
            label="Open overlay"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink />
          </IconLink>
        </div>
      </div>
      <div className="preview-stage">
        <div className="preview-canvas">
          {video.stream && <PreviewVideo stream={video.stream} />}
          <BroadcastOverlay state={preview.coverage} />
        </div>
      </div>
    </section>
  );
}
