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
    assert.equal(previewCoverage(room.state).draft, true);
    assert.equal(previewCoverage(room.state).coverage.lead?.id, "draft");
    assert.equal(overlayState(room.state).lead, null);
    room.state.stories = [{ ...story, published: true }];
    assert.equal(previewCoverage(room.state).draft, false);
    assert.equal(overlayState(room.state).lead?.id, "draft");
  } finally {
    room.dispose();
  }
});
