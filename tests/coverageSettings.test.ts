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
test("quote selection is constrained to supplied chat IDs and disabled for voice-only input", () => {
  const chat: ChatMessage = { id: "viewer", userId: "viewer", author: "Viewer", text: "A real message", at: Date.now(), source: "chat" };
  const audio = { ...chat, id: "speech", source: "audio" as const };
  const schema = createCoverageSchema(defaultCoverageSettings, [chat, audio]);
  for (const quoteId of ["speech", "invented", ""]) {
    assert.equal(schema.safeParse({ stories: [{ ...draft, quoteId }] }).success, false);
  }
  assert.equal(schema.safeParse({ stories: [{ ...draft, quoteId: "viewer" }] }).success, true);
  assert.equal(schema.safeParse({ stories: [{ ...draft, quoteId: null }] }).success, true);
  const voice = createCoverageSchema({ ...defaultCoverageSettings, includeChat: false }, [chat, audio]);
  assert.equal(voice.safeParse({ stories: [{ ...draft, quoteId: "viewer" }] }).success, false);
  assert.equal(voice.safeParse({ stories: [{ ...draft, quoteId: null }] }).success, true);
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
    assert.equal(overlayState(room.state, now).quote?.id, "a");
    room.state.coverage.quotes = false;
    assert.equal(overlayState(room.state, now).quote, null);
    room.state.coverage.lifetimeSeconds = 60;
    assert.equal(overlayState(room.state, now + 61000).lead, null);
    room.state.coverage.lifetimeSeconds = 600;
    assert.ok(overlayState(room.state, now + 61000).lead);
    assert.equal(overlayState(room.state, now + 601000).lead, null);
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
  room.state.paused = true;
  room.rescheduleCoverage();
  add("e");
  add("f");
  add("g");
  context.mock.timers.tick(10000);
  assert.equal(calls, 1);
  room.state.paused = false;
  room.rescheduleCoverage();
  context.mock.timers.tick(800);
  await new Promise((resolve) => setImmediate(resolve));
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
  assert.ok(
    prompt.includes(
      "A discussion on a different topic must become a new story",
    ),
  );
  assert.ok(
    prompt.includes("cite messageIds from at least 2 distinct userId values"),
  );
});

test("audio starts coverage automatically without waiting for chat participants", async (context) => {
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

    assert.equal(room.state.stories.length, 1);
    assert.equal(room.state.stories[0]?.quoteId, null);
    assert.equal(overlayState(room.state).lead?.id, room.state.stories[0]?.id);
  } finally {
    room.dispose();
  }
});

test("chat and voice summaries independently filter inputs without removing messages", async () => {
  for (const [includeChat, includeAudio, expected] of [
    [true, true, ["chat", "simulation", "audio"]],
    [true, false, ["chat", "simulation"]],
    [false, true, ["audio"]],
    [false, false, []],
  ] as const) {
    let received: string[] = [];
    let calls = 0;
    const room = new Newsroom(
      async (messages) => {
        calls++;
        received = messages.map((message) => message.id);
        return { stories: [] };
      },
      async () => {},
    );
    try {
      room.state.coverage = {
        ...defaultCoverageSettings,
        includeChat,
        includeAudio,
      };
      room.state.messages = (["chat", "simulation", "audio"] as const).map(
        (source) => ({
          id: source,
          userId: source,
          author: source,
          source,
          text: "Stream discussion",
          at: Date.now(),
        }),
      );
      await room.process();
      assert.deepEqual(received, expected);
      assert.equal(calls, expected.length ? 1 : 0);
      assert.equal(room.state.messages.length, 3);
      assert.equal(room.state.error, null);
    } finally {
      room.dispose();
    }
  }
});

test("disabled chat does not trigger voice-only coverage and in-flight source changes discard stale output", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let release!: (value: { stories: [] }) => void;
  let calls = 0;
  const room = new Newsroom(
    async () => {
      calls++;
      return new Promise<{ stories: [] }>((resolve) => {
        release = resolve;
      });
    },
    async () => {},
  );
  try {
    room.state.coverage = {
      ...defaultCoverageSettings,
      includeChat: false,
      minimumMessages: 1,
    };
    room.add([
      {
        id: "chat",
        userId: "viewer",
        author: "Viewer",
        source: "chat",
        text: "A chat message",
        at: Date.now(),
      },
    ]);
    context.mock.timers.tick(1000);
    assert.equal(calls, 0);
    room.add([
      {
        id: "audio",
        userId: "streamer",
        author: "Streamer",
        source: "audio",
        text: "The challenge is starting",
        at: Date.now(),
      },
    ]);
    context.mock.timers.tick(800);
    assert.equal(calls, 1);
    let applied = false;
    room.apply = () => {
      applied = true;
    };
    room.state.coverage.includeAudio = false;
    release({ stories: [] });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(applied, false);
    assert.equal(room.state.working, false);
    assert.equal(room.state.error, null);
  } finally {
    room.dispose();
  }
});
