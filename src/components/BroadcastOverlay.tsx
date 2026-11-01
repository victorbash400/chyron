import type { OverlayState } from "../../shared/types.ts";
import "./BroadcastOverlay.css";
export default function BroadcastOverlay({ state }: { state: OverlayState }) {
  if (!state.visible) return null;
  return (
    <div className="broadcast-overlay" aria-label="Broadcast overlay">
      {state.mode === "simulation" && (
        <span className="broadcast-simulation">SIMULATION</span>
      )}
      {state.lead && (
        <div className="broadcast-lower-third" key={state.lead.id}>
          <div className="broadcast-kicker">
            {state.lead.status === "BREAKING"
              ? "BREAKING NEWS"
              : state.lead.status}
          </div>
          <div className="broadcast-headline">{state.lead.headline}</div>
          {state.quote && (
            <div className="broadcast-quote">
              “{state.quote.text}” <span>@{state.quote.author}</span>
            </div>
          )}
        </div>
      )}
      {state.ticker.length > 0 && (
        <div className="broadcast-ticker">
          <span className="ticker-label">CHAT WIRE</span>
          <div className="ticker-window">
            <div className="ticker-track">
              {[0, 1].map((copy) => (
                <div
                  className="ticker-items"
                  key={copy}
                  aria-hidden={copy === 1}
                >
                  {state.ticker.map((story) => (
                    <span key={story.id}>{story.headline}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
