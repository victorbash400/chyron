import { Check } from "lucide-react";
import type { OverlayState } from "../../shared/types.ts";
import type { overlayStyles } from "../../shared/overlayDesign.ts";
import BroadcastOverlay from "./BroadcastOverlay.tsx";
import "./StyleCard.css";
export default function StyleCard({
  choice,
  index,
  selected,
  state,
  disabled,
  onSelect,
}: {
  choice: (typeof overlayStyles)[number];
  index: number;
  selected: boolean;
  state: OverlayState;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`style-card ${selected ? "is-selected" : ""}`}
      aria-label={`Style ${String(index + 1).padStart(2, "0")}: ${choice.name}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      <span className="style-number">{String(index + 1).padStart(2, "0")}</span>
      {selected && (
        <span className="style-selected">
          <Check />
        </span>
      )}
      <BroadcastOverlay state={state} thumbnail />
    </button>
  );
}
