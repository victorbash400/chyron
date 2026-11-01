import SettingsNavigation, {
  type SettingsSection,
} from "./settings/SettingsNavigation.tsx";
import { RotateCcw } from "lucide-react";
import {
  defaultOverlayDesign,
  overlayStyles,
  type OverlayDesign,
} from "../../shared/overlayDesign.ts";
import type { NewsroomState } from "../../shared/types.ts";
import { previewCoverage } from "../state/previewCoverage.ts";
import BroadcastOverlay from "./BroadcastOverlay.tsx";
import AppearanceControls from "./AppearanceControls.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import pageStyles from "./AppearancePage.module.css";
import "./AppearancePage.css";

export default function AppearancePage({
  state,
  busy,
  onChange,
  onNavigate,
}: {
  onNavigate: (section: SettingsSection) => void;
  state: NewsroomState;
  busy: boolean;
  onChange: (patch: Partial<OverlayDesign>) => void;
}) {
  const preview = previewCoverage(state).coverage;
  const sample = { ...preview, visible: true };
  return (
    <main className={`${pageStyles.main} appearance-page`}>
      <div className={pageStyles.content}>
        <header>
          <SettingsNavigation section="appearance" onChange={onNavigate} />
        </header>
        <div className="appearance-page-content">
          <div className="appearance-preview">
            <div className="appearance-preview-label">
              {
                overlayStyles.find((style) => style.id === state.design.style)
                  ?.name
              }
            </div>
            <div className="preview-canvas">
              <BroadcastOverlay state={sample} />
            </div>
          </div>
          <AppearanceControls
            design={state.design}
            busy={busy}
            onChange={onChange}
          />
          <SettingsInlineButton
            className="appearance-reset"
            onClick={() => onChange(defaultOverlayDesign)}
            disabled={busy}
          >
            <RotateCcw />
            Reset to default
          </SettingsInlineButton>
        </div>
      </div>
    </main>
  );
}
