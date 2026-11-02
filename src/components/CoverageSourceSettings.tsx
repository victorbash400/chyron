import type { CoverageSettings } from "../../shared/coverageSettings.ts";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SettingsPicker from "./settings/SettingsPicker.tsx";
import ToggleSwitch from "./controls/ToggleSwitch.tsx";
export default function CoverageSourceSettings({
  settings,
  disabled,
  onChange,
}: {
  settings: CoverageSettings;
  disabled: boolean;
  onChange: (patch: Partial<CoverageSettings>) => void;
}) {
  return (
    <SettingsGroup>
      <SettingsRow label="Authors for new story">
        <SettingsPicker
          label="Authors for new story"
          value={settings.minimumParticipants}
          options={([1, 2, 3, 5] as const).map((value) => ({
            value,
            label: String(value),
          }))}
          disabled={disabled}
          onChange={(minimumParticipants) => onChange({ minimumParticipants })}
        />
      </SettingsRow>
      <SettingsRow label="Chat context">
        <SettingsPicker
          label="Chat context"
          value={settings.contextSeconds}
          options={[
            { value: 60, label: "1 min" },
            { value: 180, label: "3 min" },
            { value: 300, label: "5 min" },
          ]}
          disabled={disabled}
          onChange={(contextSeconds) => onChange({ contextSeconds })}
        />
      </SettingsRow>
      <SettingsRow label="Audio context">
        <ToggleSwitch
          label="Audio context"
          checked={settings.includeAudio}
          disabled={disabled}
          onChange={(includeAudio) => onChange({ includeAudio })}
        />
      </SettingsRow>
      <SettingsRow label="Stories from audio">
        <ToggleSwitch
          label="Stories from audio"
          checked={settings.audioStories}
          disabled={disabled || !settings.includeAudio}
          onChange={(audioStories) => onChange({ audioStories })}
        />
      </SettingsRow>
      <SettingsRow label="Viewer quotes">
        <ToggleSwitch
          label="Viewer quotes"
          checked={settings.quotes}
          disabled={disabled}
          onChange={(quotes) => onChange({ quotes })}
        />
      </SettingsRow>
      <SettingsRow label="Story duration">
        <SettingsPicker
          label="Story duration"
          value={settings.lifetimeSeconds}
          options={[
            { value: 60, label: "1 min" },
            { value: 300, label: "5 min" },
            { value: 600, label: "10 min" },
          ]}
          disabled={disabled}
          onChange={(lifetimeSeconds) => onChange({ lifetimeSeconds })}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}
