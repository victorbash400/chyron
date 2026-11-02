import test from "node:test";
import assert from "node:assert/strict";
import { Newsroom } from "../server/newsroom.ts";
import { previewCoverage } from "../src/state/previewCoverage.ts";
import { overlayState } from "../server/ranking.ts";
import type { Story } from "../shared/types.ts";
import { previewChat } from "../src/state/previewChat.ts";
const story: Story = {
  id: "draft",
  headline: "Chat debates the keyboard",
  summary: "",
  status: "BREAKING",
  messageIds: [],
  quoteId: null,
  participants: 2,
  score: 20,
  interest: 0.5,
  updatedAt: Date.now(),
  createdAt: Date.now(),
  dismissed: false,
};
test("real coverage appears identically in the preview and the OBS feed", () => {
  const room = new Newsroom();
  try {
    room.state.stories = [story];
    assert.equal(previewCoverage(room.state).kind, "live");
    assert.deepEqual(
      previewCoverage(room.state).coverage,
      overlayState(room.state),
    );
    assert.equal(overlayState(room.state).lead?.id, story.id);
  } finally {
    room.dispose();
  }
});

test("an empty newsroom previews the selected design without publishing sample content", () => {
  const room = new Newsroom();
  try {
    room.state.design = {
      style: "signal",
      color: "#1767ff",
      size: 115,
      speed: 50,
    };
    const preview = previewCoverage(room.state);
    assert.equal(preview.kind, "sample");
    assert.ok(preview.coverage.lead?.headline);
    assert.deepEqual(preview.coverage.design, room.state.design);
    assert.deepEqual(preview.coverage.ticker, [preview.coverage.lead]);
    assert.equal(preview.coverage.quote, null);
    assert.equal(overlayState(room.state).lead, null);
    assert.deepEqual(overlayState(room.state).ticker, []);
    assert.equal(room.state.stories.length, 0);
    assert.equal(room.state.messages.length, 0);
  } finally {
    room.dispose();
  }
});

test("sample previews respect overlay visibility and exclude dismissed stories", () => {
  const room = new Newsroom();
  try {
    room.state.visible = false;
    room.state.stories = [{ ...story, dismissed: true }];
    const preview = previewCoverage(room.state);
    assert.equal(preview.kind, "sample");
    assert.equal(preview.coverage.visible, false);
    assert.notEqual(preview.coverage.lead?.id, story.id);
    assert.equal(overlayState(room.state).lead, null);
  } finally {
    room.dispose();
  }
});

test("broadcast preparation removes all illustrative preview content", () => {
  const room = new Newsroom();
  try {
    assert.equal(previewCoverage(room.state).kind, "sample");
    assert.equal(previewChat(room.state.messages, true).kind, "sample");
    assert.deepEqual(
      previewCoverage(room.state, false).coverage,
      overlayState(room.state),
    );
    assert.equal(previewCoverage(room.state, false).coverage.lead, null);
    assert.deepEqual(previewChat(room.state.messages, false).messages, []);
    assert.deepEqual(room.state.messages, []);
    assert.deepEqual(room.state.stories, []);
  } finally {
    room.dispose();
  }
});

test("video chat shows recent viewer messages and excludes speech transcripts", () => {
  const messages = Array.from({ length: 7 }, (_, index) => ({
    id: String(index),
    userId: "viewer",
    author: "Viewer",
    text: `Message ${index}`,
    at: index,
    source: "chat" as const,
  }));
  const input = [
    ...messages,
    { ...messages[0]!, id: "audio", source: "audio" as const },
  ];
  const result = previewChat(input, true);
  assert.equal(result.kind, "live");
  assert.deepEqual(result.messages, messages.slice(-5));
  assert.deepEqual(previewChat(input, false).messages, result.messages);
  assert.equal(input.length, 8);
});

test("real news stays in the video composition while samples are disabled", () => {
  const room = new Newsroom();
  try {
    room.state.stories = [story];
    assert.equal(
      previewCoverage(room.state, false).coverage.lead?.id,
      story.id,
    );
    assert.deepEqual(
      previewCoverage(room.state, false).coverage,
      overlayState(room.state),
    );
  } finally {
    room.dispose();
  }
});
