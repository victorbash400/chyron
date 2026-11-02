import { useRef, useState } from "react";
import { overlayState } from "../../server/ranking.ts";
import { useBrowserBroadcast } from "../broadcast/useBrowserBroadcast.ts";
import BroadcastButton from "./BroadcastButton.tsx";
import BroadcastDialog from "./BroadcastDialog.tsx";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import type { NewsroomState } from "../../shared/types.ts";
import { previewCoverage } from "../state/previewCoverage.ts";
import { usePreviewVideo } from "../state/usePreviewVideo.ts";
import BroadcastOverlay from "./BroadcastOverlay.tsx";
import ToolbarGroup from "./controls/ToolbarGroup.tsx";
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
  onBroadcastAudio,
}: {
  state: NewsroomState;
  url: string;
  busy: boolean;
  onSettings: (patch: { paused?: boolean; visible?: boolean }) => void;
  onError: (error: string) => void;
  onBroadcastAudio: (stream: MediaStream | null) => void;
}) {
  const video = usePreviewVideo(onError);
  const broadcast = useBrowserBroadcast(onError, onBroadcastAudio);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const preview = video.stream
    ? { kind: "live", coverage: overlayState(state) }
    : previewCoverage(state);
  return (
    <section className="workspace-panel overlay-preview" aria-label="Preview">
      <div className="panel-heading">
        <h2>Preview</h2>
        {preview.kind === "sample" && (
          <span className="draft-label">Sample</span>
        )}
        <ToolbarGroup label="Preview controls" className="preview-actions">
          <PreviewSourceMenu
            active={Boolean(video.stream)}
            disabled={video.opening || broadcast.status !== "idle"}
            onSelect={(source) => void video.start(source)}
            onRemove={video.stop}
          />
          <IconButton
            label={state.visible ? "Hide overlay" : "Show overlay"}
            title={state.visible ? "Hide overlay" : "Show overlay"}
            disabled={busy}
            onClick={() => onSettings({ visible: !state.visible })}
          >
            {state.visible ? <Eye /> : <EyeOff />}
          </IconButton>
          <IconLink
            label="Open overlay for OBS"
            title="Open overlay for OBS"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink />
          </IconLink>
          <BroadcastButton
            status={broadcast.status}
            onStart={() => setBroadcastOpen(true)}
            onStop={broadcast.stop}
          />
        </ToolbarGroup>
      </div>
      <div className="preview-stage">
        <div
          className={`preview-canvas ${video.stream ? "has-video" : ""}`}
          ref={canvas}
        >
          {video.stream && <PreviewVideo stream={video.stream} />}
          <BroadcastOverlay state={preview.coverage} />
        </div>
      </div>
      {broadcastOpen && (
        <BroadcastDialog
          hasVideo={Boolean(video.stream)}
          opening={video.opening}
          onSource={(source) => void video.start(source)}
          onClose={() => setBroadcastOpen(false)}
          onStart={(microphone, test) => {
            if (!canvas.current || !video.stream) return;
            setBroadcastOpen(false);
            void broadcast.start(
              canvas.current,
              video.stream,
              microphone,
              test,
            );
          }}
        />
      )}
    </section>
  );
}
