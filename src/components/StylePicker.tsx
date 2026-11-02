import {
  defaultOverlayDesign,
  overlayStyles,
  type OverlayDesign,
} from "../../shared/overlayDesign.ts";
import { memo } from "react";
import type { OverlayState } from "../../shared/types.ts";
import { styleSampleStory } from "../state/styleSample.ts";
import StyleCard from "./StyleCard.tsx";
import "./StylePicker.css";
const samples: OverlayState[] = overlayStyles.map((choice) => ({
  mode: "twitch",
  visible: true,
  lead: styleSampleStory,
  ticker: [styleSampleStory],
  quote: null,
  design: { ...defaultOverlayDesign, style: choice.id, color: choice.color },
}));

function StylePicker({
  design: selectedDesign,
  disabled,
  onChange,
}: {
  design: OverlayDesign;
  disabled: boolean;
  onChange: (patch: Partial<OverlayDesign>) => void;
}) {
  return (
    <section
      className="workspace-panel style-picker"
      aria-label="Overlay styles"
    >
      <div className="panel-heading">
        <h2>Styles</h2>
      </div>
      <div className="style-picker-scroll">
        {overlayStyles.map((choice, index) => {
          const base = samples[index]!;
          const sample =
            selectedDesign.style === choice.id &&
            selectedDesign.color !== base.design.color
              ? {
                  ...base,
                  design: { ...base.design, color: selectedDesign.color },
                }
              : base;
          return (
            <StyleCard
              key={choice.id}
              choice={choice}
              index={index}
              selected={selectedDesign.style === choice.id}
              state={sample}
              disabled={disabled}
              onChange={onChange}
            />
          );
        })}
      </div>
    </section>
  );
}

export default memo(
  StylePicker,
  (previous, next) =>
    previous.disabled === next.disabled &&
    previous.onChange === next.onChange &&
    previous.design.style === next.design.style &&
    previous.design.color === next.design.color,
);
