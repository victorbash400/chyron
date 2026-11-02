import type { NewsroomState } from "../../shared/types.ts";
import { overlayState } from "../../server/ranking.ts";
import { styleSampleStory } from "./styleSample.ts";

export function previewCoverage(state: NewsroomState, allowSample = true) {
  const broadcast = overlayState(state);
  if (broadcast.lead || !allowSample)
    return { coverage: broadcast, kind: "live" as const };
  return {
    kind: "sample" as const,
    coverage: {
      ...broadcast,
      lead: styleSampleStory,
      ticker: [styleSampleStory],
      quote: null,
    },
  };
}
