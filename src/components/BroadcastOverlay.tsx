import type { CSSProperties } from "react";
import type { OverlayState } from "../../shared/types.ts";
import { overlayPresentation } from "../../shared/overlayPresentation.ts";
import { catalogueStyles } from "../../shared/catalogueStyles.ts";
import CatalogueBanner from "./CatalogueBanner.tsx";
import BroadcastBanner from "./BroadcastBanner.tsx";
import BroadcastScoreboard from "./BroadcastScoreboard.tsx";
import BroadcastTicker from "./BroadcastTicker.tsx";
import BroadcastQuote from "./BroadcastQuote.tsx";
import "./BroadcastOverlay.css";
import "./BroadcastVariants.css";
export default function BroadcastOverlay({
  state,
  thumbnail = false,
}: {
  state: OverlayState;
  thumbnail?: boolean;
}) {
  if (!state.visible) return null;
  const coverage = overlayPresentation(state);
  const { design } = state;
  const light = [
    "#ffffff",
    "#ffd20a",
    "#d7ad54",
    "#76d649",
    "#00dbea",
  ].includes(design.color);
  const style = {
    "--broadcast-accent": design.color,
    "--broadcast-ink": light ? "#0b1018" : "#ffffff",
    "--broadcast-text-accent": light ? "#101827" : design.color,
    "--broadcast-scale": design.size / 100,
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
      <div className="broadcast-coverage">
        {design.style === "scoreboard" ? (
          <BroadcastScoreboard story={coverage.lead} />
        ) : catalogueStyles.some((style) => style.id === design.style) ? (
          <CatalogueBanner story={coverage.lead} />
        ) : (
          <BroadcastBanner story={coverage.lead} />
        )}
        {coverage.quote && !thumbnail && (
          <BroadcastQuote message={coverage.quote} />
        )}
        <BroadcastTicker
          stories={coverage.ticker}
          messages={coverage.tickerMessages}
          speed={design.speed}
          thumbnail={thumbnail}
        />
      </div>
    </div>
  );
}
