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
function StylePicker({
  design: selectedDesign,
  disabled,
  onChange,
}: {
  design: OverlayDesign;
  disabled: boolean;
  onChange: (patch: Partial<OverlayDesign>) => void;
}) {
  const lead = styleSampleStory;
  return (
    <section
      className="workspace-panel style-picker"
      aria-label="Overlay styles"
    >
      <div className="panel-heading">
        <h2>Styles</h2>
        <span className="count-badge">{overlayStyles.length}</span>
      </div>
      <div className="style-picker-scroll">
        {overlayStyles.map((choice, index) => {
          const design = {
            ...defaultOverlayDesign,
            style: choice.id,
            color:
              selectedDesign.style === choice.id
                ? selectedDesign.color
                : choice.color,
          };
          const sample: OverlayState = {
            mode: "twitch",
            visible: true,
            lead,
            ticker: [lead],
            quote: null,
            design,
          };
          return (
            <StyleCard
              key={choice.id}
              choice={choice}
              index={index}
              selected={selectedDesign.style === choice.id}
              state={sample}
              disabled={disabled}
              onSelect={() =>
                onChange({ style: choice.id, color: choice.color })
              }
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
