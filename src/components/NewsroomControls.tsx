import { Check, Link, Pause, Play } from "lucide-react";
import { useState } from "react";
import type { NewsroomState } from "../../shared/types.ts";
import type { OverlayDesign } from "../../shared/overlayDesign.ts";
import ColorPalette from "./ColorPalette.tsx";
import RangeControl from "./RangeControl.tsx";
import "./NewsroomControls.css";
export default function NewsroomControls({
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
  onSettings: (patch: { automatic?: boolean; paused?: boolean }) => void;
  onDesign: (patch: Partial<OverlayDesign>) => void;
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
    <div className="newsroom-controls">
      <ColorPalette
        value={state.design.color}
        disabled={busy}
        onChange={(color) => onDesign({ color })}
      />
      <RangeControl
        label="Size"
        value={state.design.size}
        min={70}
        max={130}
        disabled={busy}
        onCommit={(size) => onDesign({ size })}
      />
      <RangeControl
        label="Speed"
        value={state.design.speed}
        min={10}
        max={70}
        disabled={busy}
        onCommit={(speed) => onDesign({ speed })}
      />
      <button
        className="automatic-control"
        role="checkbox"
        aria-checked={state.automatic}
        onClick={() => onSettings({ automatic: !state.automatic })}
        disabled={busy}
      >
        <span>{state.automatic && <Check />}</span>Auto
      </button>
      <button
        className="pause-control"
        onClick={() => onSettings({ paused: !state.paused })}
        disabled={busy}
      >
        {state.paused ? <Play /> : <Pause />}
        {state.paused ? "Resume" : "Pause"}
      </button>
      <button className="copy-overlay" onClick={() => void copy()}>
        {copied ? <Check /> : <Link />}
        {copied ? "Copied" : "Copy overlay"}
      </button>
    </div>
  );
}
