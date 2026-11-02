import test from "node:test";
import assert from "node:assert/strict";
import { Newsroom } from "../server/newsroom.ts";
import { overlayState } from "../server/ranking.ts";
import { clearChatState } from "../shared/clearChat.ts";
import { overlayPresentation } from "../shared/overlayPresentation.ts";
import type { ChatMessage } from "../shared/types.ts";

test("the ticker keeps the last one to four chat messages without needing new messages or coverage", () => {
  const room = new Newsroom();
  try {
    const at = Date.now() - 3600000;
    for (let count = 1; count <= 6; count++) {
      room.state.messages = Array.from({ length: count }, (_, index): ChatMessage => ({
        id: String(index),
        userId: "viewer",
        author: "Viewer",
        text: `Message ${index}`,
        at: at + index,
        source: "chat",
      }));
      const before = overlayState(room.state);
      assert.equal(before.lead, null);
      assert.deepEqual(before.tickerMessages?.map((message) => message.id), room.state.messages.slice(-4).map((message) => message.id));
      assert.deepEqual(overlayState(room.state, Date.now() + 3600000).tickerMessages, before.tickerMessages);
      assert.deepEqual(overlayPresentation(before).tickerMessages, before.tickerMessages);
      assert.deepEqual(Object.keys(before.tickerMessages![0]).sort(), ["author", "id", "text"]);
    }
  } finally {
    room.dispose();
  }
});

test("new chat advances the ticker, audio is excluded, and clear chat empties it", () => {
  const room = new Newsroom();
  try {
    const at = Date.now() - 1000;
    const message: ChatMessage = { id: "old", userId: "viewer", author: "Viewer", text: "Chat", at, source: "chat" };
    room.state.messages = [message, { ...message, id: "voice", source: "audio" }, { ...message, id: "demo", source: "simulation" }];
    assert.deepEqual(overlayState(room.state).tickerMessages?.map((item) => item.id), ["old", "demo"]);
    room.state = clearChatState(room.state, "cleared", at + 1);
    assert.deepEqual(overlayState(room.state).tickerMessages, []);
    room.state.messages.push(message, { ...message, id: "new", at: at + 2 });
    assert.deepEqual(overlayState(room.state).tickerMessages?.map((item) => item.id), ["new"]);
  } finally {
    room.dispose();
  }
});
