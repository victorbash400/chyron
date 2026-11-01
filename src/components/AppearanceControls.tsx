import type { OverlayDesign } from "../../shared/overlayDesign.ts";
import ColorPalette from "./ColorPalette.tsx";
import RangeControl from "./RangeControl.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsGroup from "./settings/SettingsGroup.tsx";

export default function AppearanceControls({
  design,
  busy,
  onChange,
}: {
  design: OverlayDesign;
  busy: boolean;
  onChange: (patch: Partial<OverlayDesign>) => void;
}) {
  return (
    <SettingsGroup>
      <SettingsRow label="Accent color">
        <ColorPalette
          value={design.color}
          disabled={busy}
          onChange={(color) => onChange({ color })}
        />
      </SettingsRow>
      <SettingsRow label="Overlay size">
        <RangeControl
          label="Size"
          value={design.size}
          min={70}
          max={130}
          disabled={busy}
          onCommit={(size) => onChange({ size })}
        />
      </SettingsRow>
      <SettingsRow label="Ticker speed">
        <RangeControl
          label="Speed"
          value={design.speed}
          min={10}
          max={70}
          disabled={busy}
          onCommit={(speed) => onChange({ speed })}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}
