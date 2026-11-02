import test from "node:test";
import assert from "node:assert/strict";
import { DemoChat } from "../src/state/demoChat.ts";
import {
  defaultSimulatorSettings,
  type SimulatorRequest,
} from "../shared/simulator.ts";
import { Newsroom } from "../server/newsroom.ts";
const settle = () => new Promise<void>((resolve) => queueMicrotask(resolve));
function fixture() {
  const room = new Newsroom();
  room.state.mode = "simulation";
  const requests: { path: string; body?: SimulatorRequest }[] = [];
  const activity: boolean[] = [];
  const demo = new DemoChat(
    async (path, body) => {
      requests.push({ path, body });
      return true;
    },
    (active) => activity.push(active),
  );
  return { room, demo, requests, activity };
}
test("demo continues once per completed live batch and stops without restarting", async () => {
  const { room, demo, requests, activity } = fixture();
  try {
    await demo.start(room.state, defaultSimulatorSettings);
    room.state.simulator = {
      batchId: "first",
      status: "running",
      total: 12,
      delivered: 1,
    };
    demo.observe(room.state, true);
    assert.equal(requests.length, 1);
    room.state.simulator = {
      ...room.state.simulator,
      status: "idle",
      delivered: 12,
    };
    demo.observe(room.state, true);
    demo.observe(room.state, true);
    await settle();
    assert.equal(requests.length, 2);
    assert.equal(requests[1].body?.previousBatchId, "first");
    assert.equal(requests[1].body?.sourceId, room.state.sourceId);
    await demo.stop();
    room.state.simulator = {
      batchId: "second",
      status: "idle",
      total: 12,
      delivered: 12,
    };
    demo.observe(room.state, true);
    assert.deepEqual(
      requests.map((request) => request.path),
      [
        "/api/simulation/start",
        "/api/simulation/start",
        "/api/simulation/stop",
      ],
    );
    assert.deepEqual(activity, [true, false]);
  } finally {
    room.dispose();
  }
});
test("disconnects, source changes, pause and errors prevent further demo batches", async () => {
  for (const change of [
    "disconnect",
    "source",
    "pause",
    "error",
    "stop",
  ] as const) {
    const { room, demo, requests, activity } = fixture();
    try {
      await demo.start(room.state, defaultSimulatorSettings);
      room.state.simulator = {
        batchId: "first",
        status: "running",
        total: 12,
        delivered: 1,
      };
      demo.observe(room.state, true);
      if (change === "source") room.state.sourceId = "another-source";
      if (change === "pause") room.state.paused = true;
      if (change === "error") room.state.error = "Model unavailable";
      room.state.simulator =
        change === "stop"
          ? { status: "idle", delivered: 0, total: 0 }
          : { ...room.state.simulator, status: "idle", delivered: 12 };
      demo.observe(room.state, change !== "disconnect");
      await settle();
      assert.equal(requests.length, 1, change);
      assert.equal(activity.at(-1), false, change);
    } finally {
      room.dispose();
    }
  }
});
test("failed requests stop the demo instead of retrying automatically", async () => {
  const room = new Newsroom();
  room.state.mode = "simulation";
  let calls = 0;
  const activity: boolean[] = [];
  const demo = new DemoChat(
    async () => {
      calls++;
      return false;
    },
    (value) => activity.push(value),
  );
  try {
    assert.equal(await demo.start(room.state, defaultSimulatorSettings), false);
    demo.observe(room.state, true);
    assert.equal(calls, 1);
    assert.deepEqual(activity, [true, false]);
  } finally {
    room.dispose();
  }
});

test("completion received before the start response still schedules the next batch once", async () => {
  const room = new Newsroom();
  room.state.mode = "simulation";
  let release!: (value: boolean) => void;
  let calls = 0;
  const demo = new DemoChat(
    async () => {
      calls++;
      if (calls === 1)
        return new Promise<boolean>((resolve) => {
          release = resolve;
        });
      return true;
    },
    () => {},
  );
  try {
    const starting = demo.start(room.state, defaultSimulatorSettings);
    room.state.simulator = {
      batchId: "finished",
      status: "idle",
      delivered: 12,
      total: 12,
    };
    demo.observe(room.state, true);
    assert.equal(calls, 1);
    release(true);
    await starting;
    await settle();
    assert.equal(calls, 2);
    demo.observe(room.state, true);
    assert.equal(calls, 2);
  } finally {
    demo.dispose();
    room.dispose();
  }
});
