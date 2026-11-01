import type {
  CoverageSettings,
  CoverageModelOption,
} from "../../shared/coverageSettings.ts";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SettingsChoice from "./settings/SettingsChoice.tsx";
export default function CoverageWritingSettings({
  settings,
  disabled,
  onChange,
  models,
}: {
  settings: CoverageSettings;
  disabled: boolean;
  onChange: (patch: Partial<CoverageSettings>) => void;
  models: CoverageModelOption[];
}) {
  return (
    <SettingsGroup>
      <SettingsRow label="News model">
        <SettingsChoice
          label="News model"
          value={settings.model}
          options={models}
          disabled={disabled}
          onChange={(model) => onChange({ model })}
        />
      </SettingsRow>
      <SettingsRow label="Summary length">
        <SettingsChoice
          label="Summary length"
          value={settings.summary}
          options={[
            { value: "off", label: "Off" },
            { value: "brief", label: "Brief (100 chars)" },
            { value: "standard", label: "Standard (180 chars)" },
          ]}
          disabled={disabled}
          onChange={(summary) => onChange({ summary })}
        />
      </SettingsRow>
      <SettingsRow label="Writing tone">
        <SettingsChoice
          label="Writing tone"
          value={settings.tone}
          options={[
            { value: "neutral", label: "Neutral" },
            { value: "playful", label: "Playful" },
          ]}
          disabled={disabled}
          onChange={(tone) => onChange({ tone })}
        />
      </SettingsRow>
      <SettingsRow label="Stories per update">
        <SettingsChoice
          label="Stories per update"
          value={settings.maxStories}
          options={([1, 3, 5] as const).map((value) => ({
            value,
            label: String(value),
          }))}
          disabled={disabled}
          onChange={(maxStories) => onChange({ maxStories })}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}
