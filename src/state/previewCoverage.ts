import type { NewsroomState } from "../../shared/types.ts";
import { overlayState, sortedStories } from "../../server/ranking.ts";
import { styleSampleStory } from "./styleSample.ts";

export function previewCoverage(state: NewsroomState) {
  const broadcast = overlayState(state);
  if (broadcast.lead)
    return { coverage: broadcast, kind: "published" as const };
  const drafts = sortedStories(
    state.stories.filter((story) => !story.dismissed && !story.published),
  );
  const lead = drafts[0];
  if (!lead) {
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
  return {
    kind: "draft" as const,
    coverage: {
      ...broadcast,
      lead,
      ticker: drafts,
      quote:
        state.messages.find(
          (message) =>
            message.id === lead.quoteId && message.source !== "audio",
        ) ?? null,
    },
  };
}
