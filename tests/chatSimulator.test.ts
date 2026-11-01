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
  room.state.coverage.generation = "manual";
  return room;
}
test("simulator delivers model messages over time and stops without leaking into another source", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const room = fixture(),
    simulator = new ChatSimulator(room, async () => script);
  try {
    await simulator.start(defaultSimulatorSettings);
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
