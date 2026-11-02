import type { OverlayState, Story } from "./types.ts";

const emptyStory: Story = {
  id: "empty-overlay",
  headline: "Live updates",
  summary: "",
  status: "UPDATE",
  messageIds: [],
  quoteId: null,
  participants: 0,
  score: 0,
  interest: 0,
  updatedAt: 0,
  createdAt: 0,
  dismissed: false,
};

export function overlayPresentation(state: OverlayState) {
  return {
    ...state,
    lead: state.lead ?? emptyStory,
    ticker: state.lead ? state.ticker : [emptyStory],
    quote: state.lead ? state.quote : null,
  };
}
