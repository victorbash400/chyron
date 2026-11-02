import type { NewsroomState } from "./types.ts";

export function clearChatState(
  state: NewsroomState,
  sourceId: string,
  now = Date.now(),
): NewsroomState {
  const messages = state.messages.filter(
    (message) => message.source === "audio",
  );
  const audioIds = new Set(messages.map((message) => message.id));
  return {
    ...state,
    sourceId,
    chatClearedAt: now,
    messages,
    stories: state.stories.filter(
      (story) =>
        story.messageIds.length > 0 &&
        story.messageIds.every((id) => audioIds.has(id)),
    ),
    simulator: { status: "idle", delivered: 0, total: 0 },
    error: null,
  };
}
