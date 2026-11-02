import type { NewsroomState } from "../../shared/types.ts";
import { overlayState } from "../../server/ranking.ts";
import { overlayPresentation } from "../../shared/overlayPresentation.ts";

export function previewCoverage(state: NewsroomState) {
  const broadcast = overlayState(state);
  return {
    kind: broadcast.lead ? "live" as const : "empty" as const,
    coverage: overlayPresentation(broadcast),
  };
}
