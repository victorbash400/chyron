import type { CSSProperties } from "react";
import type { OverlayState } from "../../shared/types.ts";
import BroadcastBanner from "./BroadcastBanner.tsx";
import BroadcastScoreboard from "./BroadcastScoreboard.tsx";
import BroadcastTicker from "./BroadcastTicker.tsx";
import BroadcastQuote from "./BroadcastQuote.tsx";
import "./BroadcastOverlay.css";
export default function BroadcastOverlay({
  state,
  thumbnail = false,
}: {
  state: OverlayState;
  thumbnail?: boolean;
}) {
  if (!state.visible) return null;
  const { design } = state;
  const light = design.color === "#ffffff" || design.color === "#ffd20a";
  const style = {
    "--broadcast-accent": design.color,
    "--broadcast-ink": light ? "#0b1018" : "#ffffff",
    "--broadcast-scale": design.size / 100,
    "--ticker-duration": `${100 - design.speed}s`,
  } as CSSProperties;
  return (
    <div
      className={`broadcast-overlay broadcast-style-${design.style} ${thumbnail ? "is-thumbnail" : ""}`}
      style={style}
      aria-label="Broadcast overlay"
    >
      {state.mode === "simulation" && !thumbnail && (
        <span className="broadcast-simulation">SIMULATION</span>
      )}
      {state.lead && (
        <div className="broadcast-coverage">
          {design.style === "scoreboard" ? (
            <BroadcastScoreboard story={state.lead} />
          ) : (
            <BroadcastBanner story={state.lead} />
          )}
          {state.quote && !thumbnail && (
            <BroadcastQuote message={state.quote} />
          )}
          <BroadcastTicker stories={state.ticker} />
        </div>
      )}
    </div>
  );
}
