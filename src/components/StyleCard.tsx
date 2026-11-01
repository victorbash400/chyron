import { memo } from "react";
import type { OverlayDesign } from "../../shared/overlayDesign.ts";
import type { OverlayState } from "../../shared/types.ts";
import type { overlayStyles } from "../../shared/overlayDesign.ts";
import BroadcastOverlay from "./BroadcastOverlay.tsx";
import styles from "./StyleCard.module.css";
import "./StyleCard.css";

function StyleCard({
  choice,
  index,
  selected,
  state,
  disabled,
  onChange,
}: {
  choice: (typeof overlayStyles)[number];
  index: number;
  selected: boolean;
  state: OverlayState;
  disabled: boolean;
  onChange: (patch: Partial<OverlayDesign>) => void;
}) {
  return (
    <button
      className={`${styles.button} style-card`}
      aria-label={`Style ${String(index + 1).padStart(2, "0")}: ${choice.name}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => {
        if (!selected) onChange({ style: choice.id, color: choice.color });
      }}
    >
      <span className={`${styles.preview} style-card-preview`}>
        <BroadcastOverlay state={state} thumbnail />
      </span>
      <span className={styles.label}>{choice.name}</span>
    </button>
  );
}

export default memo(StyleCard);
