import test from "node:test";
import assert from "node:assert/strict";
import { Newsroom } from "../server/newsroom.ts";
import { overlayState, storyScore } from "../server/ranking.ts";
import type { ChatMessage } from "../shared/types.ts";
import type { Coverage } from "../server/editor.ts";
const at = Date.now();
const messages: ChatMessage[] = [
  {
    id: "m1",
    userId: "a",
    author: "Ada",
    text: "The keyboard cost 300 dollars",
    at,
    source: "chat",
  },
  {
    id: "m2",
    userId: "b",
    author: "Bea",
    text: "300 dollars and no backlight?",
    at,
    source: "chat",
  },
];
const coverage: Coverage = {
  stories: [
    {
      existingId: null,
      headline: "Keyboard purchase divides chat",
      summary: "Viewers question the price.",
      status: "BREAKING",
      messageIds: ["m1", "m2"],
      quoteId: "m2",
      interest: 0.7,
    },
  ],
};
function room() {
  const room = new Newsroom(
    async () => structuredClone(coverage),
    async () => {},
  );
  room.state.messages = structuredClone(messages);
  return room;
}
test("coverage is a draft until published and overlay excludes private chat", () => {
  const r = room();
  try {
    r.apply(coverage, at);
    assert.equal(overlayState(r.state, at).lead, null);
    r.state.stories[0].published = true;
    const overlay = overlayState(r.state, at);
    assert.equal(overlay.lead?.headline, coverage.stories[0].headline);
    assert.equal(overlay.quote?.text, messages[1].text);
    assert.equal("messages" in overlay, false);
  } finally {
    r.dispose();
  }
});
test("an update preserves story identity and publication", () => {
  const r = room();
  try {
    r.apply(coverage, at);
    const story = r.state.stories[0];
    story.published = true;
    r.apply(
      {
        stories: [
          {
            ...coverage.stories[0],
            existingId: story.id,
            status: "UPDATE",
            headline: "Keyboard debate develops",
          },
        ],
      },
      at + 100,
    );
    assert.equal(r.state.stories.length, 1);
    assert.equal(r.state.stories[0].id, story.id);
    assert.equal(r.state.stories[0].published, true);
  } finally {
    r.dispose();
  }
});
test("invalid evidence rejects an entire batch without partial stories", () => {
  const r = room();
  try {
    assert.throws(() =>
      r.apply(
        {
          stories: [
            coverage.stories[0],
            { ...coverage.stories[0], messageIds: ["invented"] },
          ],
        },
        at,
      ),
    );
    assert.equal(r.state.stories.length, 0);
  } finally {
    r.dispose();
  }
});
test("audio cannot be attributed as a viewer quote", () => {
  const r = room();
  try {
    r.state.messages.push({
      id: "audio",
      userId: "streamer",
      author: "Streamer",
      text: "This was a gift",
      at,
      source: "audio",
    });
    assert.throws(() =>
      r.apply(
        {
          stories: [
            {
              ...coverage.stories[0],
              messageIds: ["m1", "m2", "audio"],
              quoteId: "audio",
            },
          ],
        },
        at,
      ),
    );
  } finally {
    r.dispose();
  }
});
test("repetition by one viewer cannot start a new story", () => {
  const r = room();
  try {
    r.state.messages[1].userId = "a";
    r.apply(coverage, at);
    assert.equal(r.state.stories.length, 0);
  } finally {
    r.dispose();
  }
});
test("edited and dismissed stories resist AI overwrites", () => {
  const r = room();
  try {
    r.apply(coverage, at);
    const story = r.state.stories[0];
    story.edited = true;
    r.apply(
      {
        stories: [
          {
            ...coverage.stories[0],
            existingId: story.id,
            headline: "Overwrite",
          },
        ],
      },
      at + 1,
    );
    assert.equal(r.state.stories[0].headline, story.headline);
    r.state.stories[0].edited = false;
    r.state.stories[0].dismissed = true;
    r.apply(
      {
        stories: [
          {
            ...coverage.stories[0],
            existingId: story.id,
            headline: "Overwrite",
          },
        ],
      },
      at + 1,
    );
    assert.equal(r.state.stories[0].dismissed, true);
  } finally {
    r.dispose();
  }
});
test("deleting a supporting message removes its quote and unpublishes coverage", async () => {
  const r = room();
  try {
    r.apply(coverage, at);
    r.state.stories[0].published = true;
    await r.removeMessages(["m2"]);
    assert.equal(r.state.stories[0].quoteId, null);
    assert.equal(r.state.stories[0].published, false);
    assert.equal(r.state.messages.length, 1);
  } finally {
    r.dispose();
  }
});
test("rank counts distinct viewers rather than repeated messages", () => {
  const repeated = Array.from({ length: 50 }, (_, i) => ({
    ...messages[0],
    id: String(i),
  }));
  assert.equal(
    storyScore(repeated, 0.5, at),
    storyScore([messages[0]], 0.5, at),
  );
  assert.ok(storyScore(messages, 0.5, at) > storyScore(repeated, 0.5, at));
});
test("old coverage expires while pinned stories stay on screen", () => {
  const r = room();
  try {
    r.apply(coverage, at);
    const story = r.state.stories[0];
    story.published = true;
    assert.equal(overlayState(r.state, at + 300001).lead, null);
    story.pinned = true;
    assert.equal(overlayState(r.state, at + 300001).lead?.id, story.id);
  } finally {
    r.dispose();
  }
});
test("in-flight model output cannot cross a source reset", async () => {
  let release!: (value: Coverage) => void;
  const r = new Newsroom(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    async () => {},
  );
  try {
    r.state.messages = structuredClone(messages);
    const processing = r.process();
    await r.reset("simulation");
    release(coverage);
    await processing;
    assert.equal(r.state.stories.length, 0);
    assert.equal(r.state.mode, "simulation");
  } finally {
    r.dispose();
  }
});
test("message delivery is deduplicated", () => {
  const r = room();
  try {
    r.state.paused = true;
    r.add([messages[0], messages[0]]);
    assert.equal(r.state.messages.length, 2);
  } finally {
    r.dispose();
  }
});
test("a pinned lead survives the story retention limit", () => {
  const r = room();
  try {
    r.apply(coverage, at);
    const lead = r.state.stories[0];
    lead.pinned = true;
    lead.published = true;
    for (let index = 0; index < 35; index++) r.apply(coverage, at + index + 1);
    assert.equal(r.state.stories.length, 30);
    assert.ok(
      r.state.stories.some((story) => story.id === lead.id && story.pinned),
    );
    assert.equal(overlayState(r.state, at + 100).lead?.id, lead.id);
  } finally {
    r.dispose();
  }
});
