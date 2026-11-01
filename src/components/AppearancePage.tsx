import { RotateCcw } from "lucide-react";
import {
  defaultOverlayDesign,
  overlayStyles,
  type OverlayDesign,
} from "../../shared/overlayDesign.ts";
import type { NewsroomState } from "../../shared/types.ts";
import { previewCoverage } from "../state/previewCoverage.ts";
import { styleSampleStory } from "../state/styleSample.ts";
import BroadcastOverlay from "./BroadcastOverlay.tsx";
import AppearanceControls from "./AppearanceControls.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import pageStyles from "./AppearancePage.module.css";
import "./AppearancePage.css";

export default function AppearancePage({
  state,
  busy,
  onChange,
}: {
  state: NewsroomState;
  busy: boolean;
  onChange: (patch: Partial<OverlayDesign>) => void;
}) {
  const preview = previewCoverage(state).coverage;
  const sample = {
    ...preview,
    visible: true,
    lead: preview.lead ?? styleSampleStory,
    ticker: preview.ticker.length ? preview.ticker : [styleSampleStory],
  };
  return (
    <main className={`${pageStyles.main} appearance-page`}>
      <div className={pageStyles.content}>
        <header>
          <h1>Appearance</h1>
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
