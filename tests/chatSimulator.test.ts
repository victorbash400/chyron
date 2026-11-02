import test from "node:test";
import assert from "node:assert/strict";
import { ChatSimulator } from "../server/chatSimulator.ts";
import { Newsroom } from "../server/newsroom.ts";
import { chatScriptSchema, type ChatScript } from "../server/chatScript.ts";
import { defaultSimulatorSettings } from "../shared/simulator.ts";
const script: ChatScript = {
  users: ["Ada", "Bea", "Cam"],
  messages: Array.from({ length: 12 }, (_, index) => ({
    user: index % 3,
    text: `Keyboard discussion ${index}`,
  })),
};
function fixture() {
  const room = new Newsroom(
    async () => ({ stories: [] }),
    async () => {},
  );
  room.state.mode = "simulation";
  return room;
}
test("simulator delivers model messages over time and stops without leaking into another source", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const room = fixture(),
    simulator = new ChatSimulator(room, async () => script);
  try {
    room.state.error = "Previous simulation failed";
    await simulator.start(defaultSimulatorSettings);
    assert.equal(room.state.error, null);
    assert.equal(room.state.messages.length, 1);
    assert.equal(room.state.simulator.status, "running");
    context.mock.timers.tick(1500);
    assert.equal(room.state.messages.length, 2);
    assert.equal(room.state.messages[1]?.author, "Bea");
    assert.ok(
      room.state.messages.every((message) => message.source === "simulation"),
    );
    await room.reset("twitch");
    context.mock.timers.tick(30000);
    assert.equal(room.state.messages.length, 0);
    assert.equal(room.state.simulator.status, "idle");
  } finally {
    room.dispose();
  }
});
test("stopped generation cannot deliver late model output", async () => {
  const room = fixture();
  let release!: (value: ChatScript) => void;
  const simulator = new ChatSimulator(
    room,
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const start = simulator.start(defaultSimulatorSettings);
  assert.equal(room.state.simulator.status, "generating");
  simulator.stop();
  release(script);
  await start;
  assert.equal(room.state.messages.length, 0);
  assert.equal(room.state.simulator.status, "idle");
  room.dispose();
});
test("simulator validates authors and reports generation failure", async () => {
  const room = fixture(),
    simulator = new ChatSimulator(room, async () => {
      throw new Error("Generation unavailable");
    });
  await assert.rejects(simulator.start(defaultSimulatorSettings), {
    message: "Generation unavailable",
  });
  assert.equal(room.state.simulator.status, "idle");
  assert.equal(
    chatScriptSchema(defaultSimulatorSettings).safeParse({
      ...script,
      users: ["Ada", "ada", "Cam"],
    }).success,
    false,
  );
  assert.equal(
    chatScriptSchema(defaultSimulatorSettings).safeParse({
      ...script,
      messages: script.messages.map((message) => ({ ...message, user: 0 })),
    }).success,
    false,
  );
  room.dispose();
});

test("new batches receive speech and chat context while preserving viewer identities", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const room = fixture();
  const { chatScriptContext } = await import("../server/chatScript.ts");
  const commentary = {
    id: "speech",
    userId: "streamer",
    author: "Streamer",
    text: "I am switching to the stealth route.",
    at: Date.now(),
    source: "audio" as const,
  };
  room.state.messages = [commentary];
  const contexts: ReturnType<typeof chatScriptContext>[] = [];
  const simulator = new ChatSimulator(
    room,
    async (_settings, _signal, recent) => {
      contexts.push(recent!);
      return script;
    },
  );
  try {
    await simulator.start(defaultSimulatorSettings);
    const firstBatch = room.state.simulator.batchId;
    assert.ok(firstBatch);
    for (let index = 0; index < 11; index++) context.mock.timers.tick(1500);
    const firstUser = room.state.messages.find(
      (message) => message.source === "simulation",
    )?.userId;
    assert.equal(room.state.simulator.status, "idle");
    await simulator.start({
      ...defaultSimulatorSettings,
      sourceId: room.state.sourceId,
      previousBatchId: firstBatch,
    });
    assert.notEqual(room.state.simulator.batchId, firstBatch);
    assert.equal(room.state.messages.at(-1)?.userId, firstUser);
    assert.deepEqual(contexts[1].users, script.users);
    assert.deepEqual(contexts[1].commentary, [commentary.text]);
    assert.equal(contexts[1].chat.length, 12);
    assert.equal(
      chatScriptSchema(defaultSimulatorSettings, script.users).safeParse({
        ...script,
        users: ["NewAda", "Bea", "Cam"],
      }).success,
      false,
    );
    simulator.stop();
    await assert.rejects(
      simulator.start({
        ...defaultSimulatorSettings,
        previousBatchId: firstBatch,
      }),
      { message: "Demo chat changed. Start again." },
    );
  } finally {
    room.dispose();
  }
});
