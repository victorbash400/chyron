import type {
  CoverageSettings,
  CoverageModelOption,
} from "../../shared/coverageSettings.ts";
import SettingsPicker from "./settings/SettingsPicker.tsx";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
export default function CoverageCadenceSettings({
  settings,
  models,
  disabled,
  onChange,
}: {
  settings: CoverageSettings;
  models: CoverageModelOption[];
  disabled: boolean;
  onChange: (patch: Partial<CoverageSettings>) => void;
}) {
  return (
    <SettingsGroup>
      <SettingsRow label="Speed preset">
        <SettingsInlineButton
          disabled={disabled || !models.some((model) => model.value === "fast")}
          onClick={() =>
            onChange({
              model: "fast",
              updateDelayMs: 800,
              minimumMessages: 3,
              maxStories: 3,
              summary: "brief",
            })
          }
        >
          Fast
        </SettingsInlineButton>
        <SettingsInlineButton
          disabled={
            disabled || !models.some((model) => model.value === "reasoning")
          }
          onClick={() =>
            onChange({
              model: "reasoning",
              updateDelayMs: 1800,
              minimumMessages: 3,
              maxStories: 5,
              summary: "standard",
            })
          }
        >
          Balanced
        </SettingsInlineButton>
      </SettingsRow>
      <SettingsRow label="Batch window">
        <SettingsPicker
          label="Batch window"
          value={settings.updateDelayMs}
          options={[
            { value: 0, label: "Immediate" },
            { value: 800, label: "0.8 s" },
            { value: 1800, label: "1.8 s" },
            { value: 4000, label: "4 s" },
          ]}
          disabled={disabled}
          onChange={(updateDelayMs) => onChange({ updateDelayMs })}
        />
      </SettingsRow>
      <SettingsRow label="New messages per batch">
        <SettingsPicker
          label="New messages per batch"
          value={settings.minimumMessages}
          options={([1, 3, 5] as const).map((value) => ({
            value,
            label: String(value),
          }))}
          disabled={disabled}
          onChange={(minimumMessages) => onChange({ minimumMessages })}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}
