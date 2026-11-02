import SettingsPicker from "./settings/SettingsPicker.tsx";
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
    <SettingsPicker
      label="Audio source"
      value={source}
      options={[
        { value: "microphone", label: "Microphone" },
        { value: "tab", label: "Tab audio" },
      ]}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
