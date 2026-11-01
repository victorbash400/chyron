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
            color:
              color === "#ffffff" || color === "#ffd20a" ? "#181a25" : "#fff",
          }}
        >
          {value === color && <Check />}
        </button>
      ))}
    </div>
  );
}
