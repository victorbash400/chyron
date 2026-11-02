import SettingsPicker from "./settings/SettingsPicker.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
export default function AudioCaptureMode({
  continuous,
  seconds,
  disabled,
  onContinuous,
  onSeconds,
}: {
  continuous: boolean;
  seconds: 6 | 12;
  disabled: boolean;
  onContinuous: (value: boolean) => void;
  onSeconds: (value: 6 | 12) => void;
}) {
  return (
    <>
      <SettingsRow compact label="Capture mode">
        <SettingsPicker
          label="Capture mode"
          value={continuous ? "continuous" : "clip"}
          options={[
            { value: "clip", label: "Clip" },
            { value: "continuous", label: "Continuous" },
          ]}
          disabled={disabled}
          onChange={(value) => onContinuous(value === "continuous")}
        />
      </SettingsRow>
      {continuous && (
        <SettingsRow compact label="Audio chunks">
          <SettingsPicker
            label="Audio chunks"
            value={seconds}
            options={[
              { value: 6, label: "6 s" },
              { value: 12, label: "12 s" },
            ]}
            disabled={disabled}
            onChange={onSeconds}
          />
        </SettingsRow>
      )}
    </>
  );
}
