import { Mic, Monitor } from "lucide-react";
import IconButton from "./controls/IconButton.tsx";
import "./AudioSourcePicker.css";
export default function AudioSourcePicker({
  source,
  disabled,
  onChange,
}: {
  source: "microphone" | "tab";
  disabled: boolean;
  onChange: (source: "microphone" | "tab") => void;
}) {
  return (
    <div className="audio-source-picker" role="group" aria-label="Audio source">
      <IconButton
        label="Microphone source"
        selected={source === "microphone"}
        disabled={disabled}
        onClick={() => onChange("microphone")}
      >
        <Mic />
      </IconButton>
      <IconButton
        label="Tab audio source"
        selected={source === "tab"}
        disabled={disabled}
        onClick={() => onChange("tab")}
      >
        <Monitor />
      </IconButton>
    </div>
  );
}
