import type { SourceMode } from "../../shared/types.ts";
import SettingsPicker from "./settings/SettingsPicker.tsx";
export default function SourceSwitch({
  mode,
  disabled,
  onChange,
}: {
  mode: SourceMode;
  disabled: boolean;
  onChange: (mode: SourceMode) => void;
}) {
  return (
    <SettingsPicker
      label="Chat source"
      value={mode}
      options={[
        { value: "twitch", label: "Twitch" },
        { value: "simulation", label: "Demo chat" },
      ]}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
