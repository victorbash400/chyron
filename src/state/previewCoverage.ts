import type { NewsroomState } from "../../shared/types.ts";
import { overlayState, sortedStories } from "../../server/ranking.ts";
export function previewCoverage(state: NewsroomState) {
  const broadcast = overlayState(state);
  if (broadcast.lead) return { coverage: broadcast, draft: false };
  const drafts = sortedStories(
    state.stories.filter((story) => !story.dismissed && !story.published),
  );
  const lead = drafts[0] ?? null;
  return {
    draft: Boolean(lead),
    coverage: {
      ...broadcast,
      lead,
      ticker: drafts,
      quote:
        state.messages.find(
          (message) =>
            message.id === lead?.quoteId && message.source !== "audio",
        ) ?? null,
    },
  };
}
