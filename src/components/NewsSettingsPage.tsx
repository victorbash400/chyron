import CoverageCadenceSettings from "./CoverageCadenceSettings.tsx";
import CoverageEditorialSettings from "./CoverageEditorialSettings.tsx";
import {
  defaultCoverageSettings,
  type CoverageModelOption,
  type CoverageSettings,
} from "../../shared/coverageSettings.ts";
import CoverageWritingSettings from "./CoverageWritingSettings.tsx";
import CoverageSourceSettings from "./CoverageSourceSettings.tsx";
import SettingsNavigation, {
  type SettingsSection,
} from "./settings/SettingsNavigation.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import pageStyles from "./AppearancePage.module.css";
import "./NewsSettingsPage.css";
export default function NewsSettingsPage({
  settings,
  models,
  disabled,
  onChange,
  onNavigate,
}: {
  settings: CoverageSettings;
  models: CoverageModelOption[];
  disabled: boolean;
  onChange: (patch: Partial<CoverageSettings>) => void;
  onNavigate: (section: SettingsSection) => void;
}) {
  return (
    <main className={`${pageStyles.main} news-settings`}>
      <div className={pageStyles.content}>
        <header>
          <SettingsNavigation section="news" onChange={onNavigate} />
        </header>
        <div className="news-settings-groups">
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
              !models.some(
                (model) => model.value === defaultCoverageSettings.model,
              )
            }
            onClick={() => onChange(defaultCoverageSettings)}
          >
            Reset to default
          </SettingsInlineButton>
        </div>
      </div>
    </main>
  );
}
