import CoverageCadenceSettings from "./CoverageCadenceSettings.tsx";
import CoverageEditorialSettings from "./CoverageEditorialSettings.tsx";
import {
  defaultCoverageSettings,
  type CoverageModelOption,
  type CoverageSettings,
} from "../../shared/coverageSettings.ts";
import CoverageWritingSettings from "./CoverageWritingSettings.tsx";
import CoverageSourceSettings from "./CoverageSourceSettings.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./CoverageControls.css";
export default function CoverageControls({
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
    <div className="coverage-controls">
      <CoverageCadenceSettings
        settings={settings}
        models={models}
        disabled={disabled}
        onChange={onChange}
      />
      <CoverageEditorialSettings
        settings={settings}
        disabled={disabled}
        onChange={onChange}
      />
      <CoverageWritingSettings
        settings={settings}
        models={models}
        disabled={disabled}
        onChange={onChange}
      />
      <CoverageSourceSettings
        settings={settings}
        disabled={disabled}
        onChange={onChange}
      />
      <SettingsInlineButton
        className="news-settings-reset"
        disabled={
          disabled ||
          !models.some((model) => model.value === defaultCoverageSettings.model)
        }
        onClick={() => onChange(defaultCoverageSettings)}
      >
        Reset to default
      </SettingsInlineButton>
    </div>
  );
}
