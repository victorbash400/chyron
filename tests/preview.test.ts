import test from "node:test";
import assert from "node:assert/strict";
import { Newsroom } from "../server/newsroom.ts";
import { previewCoverage } from "../src/state/previewCoverage.ts";
import { overlayState } from "../server/ranking.ts";
import type { Story } from "../shared/types.ts";
import { previewChat } from "../src/state/previewChat.ts";
import { overlayPresentation } from "../shared/overlayPresentation.ts";
import { overlayStyleIds } from "../shared/overlayDesign.ts";
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

test("an empty newsroom displays the selected design without creating a story", () => {
  const room = new Newsroom();
  try {
    room.state.design = {
      style: "signal",
      color: "#1767ff",
      size: 115,
      speed: 50,
    };
    const preview = previewCoverage(room.state);
    assert.equal(preview.kind, "empty");
    assert.equal(preview.coverage.lead?.headline, "Live updates");
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
    assert.equal(preview.kind, "empty");
    assert.equal(preview.coverage.visible, false);
    assert.notEqual(preview.coverage.lead?.id, story.id);
    assert.equal(overlayState(room.state).lead, null);
  } finally {
    room.dispose();
  }
});

test("the empty chyron remains in the broadcast composition while fake chat is removed", () => {
  const room = new Newsroom();
  try {
    assert.equal(previewCoverage(room.state).kind, "empty");
    assert.equal(previewChat(room.state.messages, true).kind, "sample");
    assert.deepEqual(
      previewCoverage(room.state).coverage,
      overlayPresentation(overlayState(room.state)),
    );
    assert.equal(previewCoverage(room.state).coverage.lead.headline, "Live updates");
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
      previewCoverage(room.state).coverage.lead?.id,
      story.id,
    );
    assert.deepEqual(
      previewCoverage(room.state).coverage,
      overlayState(room.state),
    );
  } finally {
    room.dispose();
  }
});

test("every style has the same empty presentation in preview and the external overlay", () => {
  const room = new Newsroom();
  try {
    for (const style of overlayStyleIds) {
      room.state.design.style = style;
      const external = overlayPresentation(overlayState(room.state));
      assert.equal(external.lead.headline, "Live updates");
      assert.equal(external.design.style, style);
      assert.deepEqual(previewCoverage(room.state).coverage, external);
      assert.equal(room.state.stories.length, 0);
    }
    room.state.visible = false;
    assert.equal(overlayPresentation(overlayState(room.state)).visible, false);
    room.state.visible = true;
    room.state.stories = [story];
    assert.equal(overlayPresentation(overlayState(room.state)).lead.id, story.id);
    room.state.stories = [{ ...story, updatedAt: 0 }];
    assert.equal(overlayPresentation(overlayState(room.state)).lead.headline, "Live updates");
  } finally {
    room.dispose();
  }
});

test("generated demo messages remain in the Twitch video composition during broadcast", () => {
  const demo = {
    id: "demo",
    userId: "sim-Ada",
    author: "Ada",
    text: "Try the stealth route.",
    source: "simulation" as const,
    at: Date.now(),
  };
  assert.deepEqual(previewChat([demo], false).messages, [demo]);
  assert.equal(previewChat([demo], false).kind, "live");
});
