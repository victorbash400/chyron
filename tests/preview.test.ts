import test from "node:test";
import assert from "node:assert/strict";
import { Newsroom } from "../server/newsroom.ts";
import { previewCoverage } from "../src/state/previewCoverage.ts";
import { overlayState } from "../server/ranking.ts";
import type { Story } from "../shared/types.ts";
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
  published: false,
  pinned: false,
  dismissed: false,
  edited: false,
};
test("draft previews never publish into the OBS feed", () => {
  const room = new Newsroom();
  try {
    room.state.stories = [story];
    assert.equal(previewCoverage(room.state).kind, "draft");
    assert.equal(previewCoverage(room.state).coverage.lead?.id, "draft");
    assert.equal(overlayState(room.state).lead, null);
    room.state.stories = [{ ...story, published: true }];
    assert.equal(previewCoverage(room.state).kind, "published");
    assert.equal(overlayState(room.state).lead?.id, "draft");
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
