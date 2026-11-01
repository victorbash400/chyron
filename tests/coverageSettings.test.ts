import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultCoverageSettings,
  type CoverageSettings,
} from "../shared/coverageSettings.ts";
import { createCoverageSchema } from "../server/editor.ts";
import { Newsroom } from "../server/newsroom.ts";
import { overlayState } from "../server/ranking.ts";
import type { ChatMessage } from "../shared/types.ts";
const draft = {
  existingId: null,
  headline: "Chat discusses keyboards",
  summary: "Viewers discuss the keyboard.",
  status: "DEVELOPING",
  messageIds: ["a", "b"],
  quoteId: null,
  interest: 0.5,
} as const;
test("summary length, quote selection, and story count are enforced in structured output", () => {
  const story = { ...draft, messageIds: [...draft.messageIds] };
  const brief = createCoverageSchema({
    ...defaultCoverageSettings,
    summary: "brief",
    maxStories: 1,
    quotes: false,
  });
  assert.equal(brief.safeParse({ stories: [story] }).success, true);
  assert.equal(
    brief.safeParse({ stories: [{ ...story, summary: "x".repeat(101) }] })
      .success,
    false,
  );
  assert.equal(brief.safeParse({ stories: [story, story] }).success, false);
  assert.equal(
    brief.safeParse({ stories: [{ ...story, quoteId: "a" }] }).success,
    false,
  );
  const off = createCoverageSchema({
    ...defaultCoverageSettings,
    summary: "off",
  });
  assert.equal(off.safeParse({ stories: [story] }).success, false);
  assert.equal(
    off.safeParse({ stories: [{ ...story, summary: "" }] }).success,
    true,
  );
});
test("generation receives the selected model, tone, time window and filtered audio context", async () => {
  let selected: CoverageSettings | undefined;
  let ids: string[] = [];
  const room = new Newsroom(
    async (messages, _stories, settings) => {
      selected = settings;
      ids = messages.map((message) => message.id);
      return { stories: [] };
    },
    async () => {},
  );
  try {
    room.state.coverage = {
      ...defaultCoverageSettings,
      model: "fast",
      tone: "neutral",
      contextSeconds: 60,
      includeAudio: false,
    };
    const message: ChatMessage = {
      id: "a",
      userId: "a",
      author: "Ada",
      text: "Keyboard chat",
      at: Date.now(),
      source: "chat",
    };
    room.state.messages = [
      message,
      { ...message, id: "old", at: Date.now() - 90000 },
      { ...message, id: "audio", source: "audio" },
    ];
    await room.process();
    assert.deepEqual(selected, room.state.coverage);
    assert.deepEqual(ids, ["a"]);
  } finally {
    room.dispose();
  }
});
test("participant threshold, viewer quotes and story duration affect coverage", () => {
  const room = new Newsroom(
    async () => ({ stories: [] }),
    async () => {},
  );
  try {
    const now = Date.now();
    room.state.messages = ["a", "b"].map((id) => ({
      id,
      userId: id,
      author: id,
      text: "Keyboard chat",
      at: now,
      source: "chat",
    }));
    room.state.coverage.minimumParticipants = 3;
    room.apply(
      { stories: [{ ...draft, messageIds: [...draft.messageIds] }] },
      now,
    );
    assert.equal(room.state.stories.length, 0);
    room.state.coverage.minimumParticipants = 2;
    room.apply(
      {
        stories: [
          { ...draft, messageIds: [...draft.messageIds], quoteId: "a" },
        ],
      },
      now,
    );
    room.state.stories[0]!.published = true;
    assert.equal(overlayState(room.state, now).quote?.id, "a");
    room.state.coverage.quotes = false;
    assert.equal(overlayState(room.state, now).quote, null);
    room.state.coverage.lifetimeSeconds = 60;
    assert.equal(overlayState(room.state, now + 61000).lead, null);
    room.state.coverage.lifetimeSeconds = 600;
    assert.ok(overlayState(room.state, now + 61000).lead);
    room.state.stories[0]!.pinned = true;
    assert.ok(overlayState(room.state, now + 601000).lead);
  } finally {
    room.dispose();
  }
});
