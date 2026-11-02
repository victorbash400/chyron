import { Check } from "lucide-react";
import {
  overlayColors,
  type OverlayDesign,
} from "../../shared/overlayDesign.ts";
import "./ColorPalette.css";
const labels = [
  "Red",
  "Blue",
  "Purple",
  "Yellow",
  "Green",
  "Black",
  "White",
  "Orange",
  "Cyan",
  "Gold",
  "Burgundy",
  "Lime",
  "Orchid",
];
export default function ColorPalette({
  value,
  disabled,
  onChange,
}: {
  value: OverlayDesign["color"];
  disabled: boolean;
  onChange: (color: OverlayDesign["color"]) => void;
}) {
  return (
    <div className="color-palette" role="group" aria-label="Overlay color">
      {overlayColors.map((color, index) => (
        <button
          key={color}
          aria-label={`${labels[index]} overlay`}
          aria-pressed={value === color}
          disabled={disabled}
          onClick={() => onChange(color)}
          style={{
            background: color,
            color: [
              "#ffffff",
              "#ffd20a",
              "#00dbea",
              "#d7ad54",
              "#76d649",
            ].includes(color)
              ? "#181a25"
              : "#fff",
          }}
        >
          {value === color && <Check />}
        </button>
      ))}
    </div>
  );
}
