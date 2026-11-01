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

test("automatic batching waits for the message threshold and does not starve during busy chat", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  const room = new Newsroom(
    async () => {
      calls++;
      return { stories: [] };
    },
    async () => {},
  );
  room.state.coverage.minimumMessages = 3;
  room.state.coverage.updateDelayMs = 800;
  const add = (id: string) =>
    room.add([
      {
        id,
        userId: id,
        author: id,
        text: "Keyboard chat",
        at: Date.now(),
        source: "chat",
      },
    ]);
  add("a");
  context.mock.timers.tick(1000);
  assert.equal(calls, 0);
  add("b");
  add("c");
  context.mock.timers.tick(400);
  add("d");
  context.mock.timers.tick(400);
  assert.equal(calls, 1);
  await new Promise((resolve) => setImmediate(resolve));
  room.state.coverage.generation = "manual";
  room.rescheduleCoverage();
  add("e");
  add("f");
  add("g");
  context.mock.timers.tick(10000);
  assert.equal(calls, 1);
  await room.process();
  assert.equal(calls, 2);
  room.dispose();
});

test("editorial format, newsworthiness and user direction reach the newsroom prompt", async () => {
  const { coveragePrompt } = await import("../server/editor.ts");
  const prompt = coveragePrompt({
    ...defaultCoverageSettings,
    focus: "recap",
    newsworthiness: "major",
    instructions: "Focus on cooking and ingredient changes.",
  });
  assert.ok(prompt.includes("main themes"));
  assert.ok(prompt.includes("Only cover major developments"));
  assert.ok(prompt.includes("Focus on cooking and ingredient changes."));
  assert.ok(prompt.includes("Never invent facts"));
  assert.ok(prompt.includes("A discussion on a different topic must become a new story"));
  assert.ok(prompt.includes("cite messageIds from at least 2 distinct userId values"));
});

test("audio can start news only when explicitly enabled and triggers generation without waiting for chat", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  const room = new Newsroom(
    async () => {
      calls++;
      return { stories: [] };
    },
    async () => {},
  );
  try {
    room.state.coverage.minimumMessages = 5;
    room.state.coverage.updateDelayMs = 800;
    const message: ChatMessage = {
      id: "voice",
      userId: "streamer",
      author: "Streamer",
      source: "audio",
      text: "The cooking challenge is starting now.",
      at: Date.now(),
    };
    room.add([message]);
    context.mock.timers.tick(800);
    assert.equal(calls, 1);
    await new Promise((resolve) => setImmediate(resolve));
    const output = {
      stories: [{ ...draft, messageIds: ["voice"], quoteId: null }],
    };
    room.apply(output, Date.now());
    assert.equal(room.state.stories.length, 0);
    room.state.coverage.audioStories = true;
    room.apply(output, Date.now());
    assert.equal(room.state.stories.length, 1);
    assert.equal(room.state.stories[0]?.quoteId, null);
  } finally {
    room.dispose();
  }
});
