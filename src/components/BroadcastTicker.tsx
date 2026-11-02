import type { CSSProperties } from "react";
import type { OverlayState } from "../../shared/types.ts";
import { useTickerLoop } from "../state/useTickerLoop.ts";
import "./BroadcastTicker.css";
export default function BroadcastTicker({
  stories,
  messages = [],
  speed,
  thumbnail,
}: {
  stories: OverlayState["ticker"];
  messages: OverlayState["tickerMessages"];
  speed: number;
  thumbnail: boolean;
}) {
  const items = messages.length
    ? messages.map(({ id, author, text }) => ({ id, text: `${author}: ${text}` }))
    : stories.map(({ id, headline }) => ({ id, text: headline }));
  const loop = useTickerLoop(thumbnail, items.length > 0);
  const style = {
    "--ticker-distance": `${-loop.width}px`,
    "--ticker-duration": `${Math.max(loop.width / (20 + speed), 0.1)}s`,
  } as CSSProperties;
  if (!items.length) return null;
  return (
    <div className="broadcast-ticker">
      <span className="ticker-label">CHYRON.</span>
      <div className="ticker-window" ref={loop.viewport}>
        <div className="ticker-track" style={style}>
          {Array.from({ length: loop.copies }, (_, copy) => (
            <div
              className="ticker-items"
              key={copy}
              ref={copy === 0 ? loop.sample : undefined}
              aria-hidden={copy > 0}
            >
              {items.map((item) => (
                <span key={item.id}>{item.text}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
