import type {
  ChatMessage,
  Story,
  OverlayState,
  NewsroomState,
} from "../shared/types.ts";
export function storyScore(
  messages: ChatMessage[],
  interest: number,
  now: number,
) {
  const viewers = new Set(
    messages.filter((m) => m.source !== "audio").map((m) => m.userId),
  );
  const recent = new Set(
    messages
      .filter((m) => m.at > now - 30000 && m.source !== "audio")
      .map((m) => m.userId),
  );
  const previous = new Set(
    messages
      .filter(
        (m) =>
          m.at <= now - 30000 && m.at > now - 60000 && m.source !== "audio",
      )
      .map((m) => m.userId),
  );
  const latest = Math.max(...messages.map((m) => m.at), 0);
  const freshness = Math.max(0, 1 - (now - latest) / 180000);
  return Math.round(
    (Math.min(viewers.size, 20) * 3 +
      Math.max(0, recent.size - previous.size) * 5 +
      interest * 25) *
      freshness,
  );
}
export function sortedStories(stories: Story[], now = Date.now()) {
  return [...stories].sort(
    (a, b) =>
      b.score * Math.exp(-(now - b.updatedAt) / 120000) -
      a.score * Math.exp(-(now - a.updatedAt) / 120000),
  );
}
export function overlayState(
  state: NewsroomState,
  now = Date.now(),
): OverlayState {
  const stories = sortedStories(
    state.stories.filter(
      (s) =>
        !s.dismissed &&
        now - s.updatedAt < state.coverage.lifetimeSeconds * 1000,
    ),
    now,
  );
  const lead = stories[0] ?? null;
  return {
    design: state.design,
    mode: state.mode,
    visible: state.visible,
    lead,
    ticker: stories,
    quote: state.coverage.quotes
      ? (state.messages.find(
          (m) => m.id === lead?.quoteId && m.source !== "audio",
        ) ?? null)
      : null,
  };
}
