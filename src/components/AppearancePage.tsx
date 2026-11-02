import { RotateCcw } from "lucide-react";
import {
  defaultOverlayDesign,
  type OverlayDesign,
} from "../../shared/overlayDesign.ts";
import type { NewsroomState } from "../../shared/types.ts";
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
  return (
    <main className={`${pageStyles.main} appearance-page`}>
      <div className={pageStyles.content}>
        <div className="appearance-page-content">
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
