import test from "node:test";
import assert from "node:assert/strict";
import { chatMessages } from "../src/state/chatMessages.ts";
import { previewChat } from "../src/state/previewChat.ts";
import type { ChatMessage } from "../shared/types.ts";
test("both chat surfaces exclude audio while preserving viewer messages and their source records", () => {
  const base = { userId: "viewer", author: "Viewer", at: 1 };
  const messages: ChatMessage[] = [
    { ...base, id: "chat", source: "chat", text: "Audio is working" },
    { ...base, id: "audio", source: "audio", text: "Audio," },
    {
      ...base,
      id: "speech",
      source: "audio",
      text: "The next round starts soon",
    },
    {
      ...base,
      id: "simulation",
      source: "simulation",
      text: "Try the other route",
    },
  ];
  const visible = chatMessages(messages);
  assert.deepEqual(
    visible.map((message) => message.id),
    ["chat", "simulation"],
  );
  assert.deepEqual(previewChat(messages, false).messages, visible);
  assert.equal(messages.length, 4);
  assert.equal(messages[2]!.text, "The next round starts soon");
});
