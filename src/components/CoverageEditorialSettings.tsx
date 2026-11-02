import type { CoverageSettings } from "../../shared/coverageSettings.ts";
import SettingsPicker from "./settings/SettingsPicker.tsx";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import "./CoverageEditorialSettings.css";
export default function CoverageEditorialSettings({
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
      <SettingsRow label="News format">
        <SettingsPicker
          label="News format"
          value={settings.focus}
          options={[
            { value: "headlines", label: "Headlines" },
            { value: "recap", label: "Chat recap" },
            { value: "developments", label: "Developments" },
          ]}
          disabled={disabled}
          onChange={(focus) => onChange({ focus })}
        />
      </SettingsRow>
      <SettingsRow label="Newsworthiness">
        <SettingsPicker
          label="Newsworthiness"
          value={settings.newsworthiness}
          options={[
            { value: "all", label: "All discussions" },
            { value: "notable", label: "Notable" },
            { value: "major", label: "Major only" },
          ]}
          disabled={disabled}
          onChange={(newsworthiness) => onChange({ newsworthiness })}
        />
      </SettingsRow>
      <SettingsRow label="Editorial direction">
        <textarea
          className="editorial-direction"
          key={settings.instructions}
          defaultValue={settings.instructions}
          aria-label="Editorial direction"
          placeholder="Topics, wording and reporting priorities"
          maxLength={600}
          rows={3}
          disabled={disabled}
          onBlur={(event) => {
            const instructions = event.currentTarget.value.trim();
            if (instructions !== settings.instructions)
              onChange({ instructions });
          }}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}
