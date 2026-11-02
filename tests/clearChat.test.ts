import test from "node:test";
import assert from "node:assert/strict";
import { clearChatState } from "../shared/clearChat.ts";
import { Newsroom } from "../server/newsroom.ts";
import type { Story, ChatMessage } from "../shared/types.ts";
import type { Coverage } from "../server/editor.ts";

test("clear chat preserves voice, settings and Twitch connection while removing chat-dependent updates", () => {
  const room = new Newsroom();
  try {
    const at = Date.now();
    const chat: ChatMessage = { id: "chat", author: "Viewer", userId: "viewer", text: "Chat message", at, source: "chat" };
    const voice: ChatMessage = { ...chat, id: "voice", source: "audio" };
    const story: Story = { id: "chat-story", headline: "Chat update", summary: "", status: "UPDATE", messageIds: [chat.id], quoteId: chat.id, participants: 1, score: 1, interest: 0.5, updatedAt: at, createdAt: at, dismissed: false };
    room.state.connection = "connected";
    room.state.messages = [chat, { ...chat, id: "demo", source: "simulation" }, voice];
    room.state.stories = [story, { ...story, id: "voice-story", messageIds: [voice.id], quoteId: null }, { ...story, id: "mixed-story", messageIds: [chat.id, voice.id] }];
    room.state.simulator = { status: "running", delivered: 1, total: 12 };
    const next = clearChatState(room.state, "cleared", at + 1);
    assert.deepEqual(next.messages, [voice]);
    assert.deepEqual(next.stories.map((item) => item.id), ["voice-story"]);
    assert.equal(next.sourceId, "cleared");
    assert.equal(next.chatClearedAt, at + 1);
    assert.equal(next.simulator.status, "idle");
    assert.equal(next.connection, "connected");
    assert.deepEqual(next.coverage, room.state.coverage);
    assert.deepEqual(next.design, room.state.design);
    assert.equal(room.state.messages.length, 3);
  } finally {
    room.dispose();
  }
});

test("cleared chat cannot return through delayed delivery or an in-flight generation", async () => {
  let finish!: (value: Coverage) => void;
  const room = new Newsroom(() => new Promise((resolve) => { finish = resolve; }), async () => {});
  try {
    const at = Date.now() - 1000;
    const chat: ChatMessage = { id: "old", author: "Viewer", userId: "viewer", text: "Old message", at, source: "chat" };
    room.state.messages = [chat];
    const processing = room.process();
    const previousSource = room.state.sourceId;
    await room.clearChat();
    assert.notEqual(room.state.sourceId, previousSource);
    finish({ stories: [{ existingId: null, headline: "Old update", summary: "", status: "UPDATE", messageIds: [chat.id], quoteId: null, interest: 0.5 }] });
    await processing;
    assert.equal(room.state.messages.length, 0);
    assert.deepEqual(room.state.stories, []);
    room.state.paused = true;
    room.add([chat, { ...chat, id: "new", at: room.state.chatClearedAt! + 1 }]);
    assert.deepEqual(room.state.messages.map((message) => message.id), ["new"]);
  } finally {
    room.dispose();
  }
});
