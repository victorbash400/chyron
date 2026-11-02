import { get, type IncomingMessage } from "node:http";
import { overlayStyles } from "../shared/overlayDesign.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.ts";
import { Newsroom } from "../server/newsroom.ts";
process.env.COOKIE_SECRET =
  "test-only-cookie-secret-with-at-least-32-characters";
process.env.APP_ORIGIN = "http://localhost:5173";
process.env.PORT = "5173";
async function fixture() {
  const room = new Newsroom(
    async () => ({ stories: [] }),
    async () => {},
  );
  const { app } = await createApp(room);
  return {
    app,
    room,
    request: (
      url: string,
      payload?: unknown,
      headers: Record<string, string> = {},
    ) =>
      app.inject({
        method: payload === undefined ? "GET" : "POST",
        url,
        payload: payload === undefined ? undefined : JSON.stringify(payload),
        headers: {
          host: "localhost:5173",
          ...(payload === undefined
            ? {}
            : { "content-type": "application/json" }),
          ...headers,
        },
      }),
  };
}
test("API rejects foreign hosts and cross-site mutations", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await f.request("/api/bootstrap", undefined, {
          host: "foreign.example",
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await f.request(
          "/api/settings",
          { paused: true },
          { origin: "https://foreign.example" },
        )
      ).statusCode,
      403,
    );
    assert.equal(f.room.state.paused, false);
  } finally {
    await f.app.close();
  }
});
test("overlay endpoint requires its exact capability token and returns only broadcast data", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.request("/api/overlay/incorrect")).statusCode, 404);
    const response = await f.request(`/api/overlay/${f.room.overlayToken}`);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(Object.keys(response.json()).sort(), [
      "design",
      "lead",
      "mode",
      "quote",
      "ticker",
      "visible",
    ]);
  } finally {
    await f.app.close();
  }
});
test("simulation is explicit and settings are validated", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await f.request("/api/simulation/message", {
          author: "Ada",
          text: "Hello chat",
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (await f.request("/api/mode", { mode: "simulation" })).statusCode,
      200,
    );
    assert.equal(
      (await f.request("/api/settings", { paused: true })).statusCode,
      200,
    );
    assert.equal(
      (
        await f.request("/api/simulation/message", {
          author: "Ada",
          text: "Hello chat",
        })
      ).statusCode,
      200,
    );
    assert.ok(f.room.state.messages.every((m) => m.source === "simulation"));
    assert.equal(
      (await f.request("/api/settings", { paused: "yes" })).statusCode,
      400,
    );
  } finally {
    await f.app.close();
  }
});
test("OAuth rejects missing state before contacting Twitch", async () => {
  const f = await fixture();
  try {
    const response = await f.request(
      "/api/twitch/callback?code=untrusted&state=untrusted",
    );
    assert.equal(response.statusCode, 400);
    assert.equal(f.room.state.channel, null);
  } finally {
    await f.app.close();
  }
});
test("cross-site page navigation is allowed while API access remains protected", async () => {
  const f = await fixture();
  try {
    const response = await f.request("/", undefined, {
      "sec-fetch-site": "cross-site",
    });
    assert.equal(response.statusCode, 404);
    assert.equal(
      (
        await f.request("/api/bootstrap", undefined, {
          "sec-fetch-site": "cross-site",
        })
      ).statusCode,
      403,
    );
  } finally {
    await f.app.close();
  }
});
test("overlay design updates reach the read-only broadcast feed and preserve other controls", async () => {
  const f = await fixture();
  try {
    const update = await f.request("/api/settings", {
      design: { style: "neon", color: "#1767ff", size: 115, speed: 60 },
    });
    assert.equal(update.statusCode, 200);
    const overlay = (
      await f.request(`/api/overlay/${f.room.overlayToken}`)
    ).json();
    assert.deepEqual(overlay.design, {
      style: "neon",
      color: "#1767ff",
      size: 115,
      speed: 60,
    });
    assert.equal(f.room.state.paused, false);
    assert.equal(
      (await f.request("/api/settings", { design: { size: 400 } })).statusCode,
      400,
    );
    assert.equal(
      (await f.request("/api/settings", { design: { color: "invalid" } }))
        .statusCode,
      400,
    );
    assert.equal(
      (await f.request("/api/settings", { design: { speed: 0 } })).statusCode,
      400,
    );
    assert.equal(f.room.state.design.size, 115);
  } finally {
    await f.app.close();
  }
});

test("every style can be saved and is returned in the broadcast feed", async () => {
  const f = await fixture();
  try {
    for (const style of overlayStyles) {
      await f.request("/api/settings", { visible: false });
      const response = await f.request("/api/settings", {
        design: { style: style.id, color: style.color },
      });
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().visible, true);
      const overlay = (
        await f.request(`/api/overlay/${f.room.overlayToken}`)
      ).json();
      assert.equal(overlay.design.style, style.id);
      assert.equal(overlay.design.color, style.color);
      assert.equal(overlay.visible, true);
    }
    await f.request("/api/settings", { visible: false });
    await f.request("/api/settings", { design: { color: "#1767ff" } });
    assert.equal(f.room.state.visible, false);
    assert.equal(
      (await f.request("/api/settings", { design: { style: "unknown" } }))
        .statusCode,
      400,
    );
  } finally {
    await f.app.close();
  }
});

test("simulation messages preserve chat identity and reject invalid input", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await f.request("/api/simulation/message", {
          author: "viewer",
          text: "Hello chat",
        })
      ).statusCode,
      400,
    );
    await f.request("/api/mode", { mode: "simulation" });
    const response = await f.request("/api/simulation/message", {
      author: "  pixelpilot  ",
      text: "  Hello chat  ",
    });
    assert.equal(response.statusCode, 200);
    const message = f.room.state.messages.at(-1)!;
    assert.equal(message.author, "pixelpilot");
    assert.equal(message.userId, "sim-pixelpilot");
    assert.equal(message.text, "Hello chat");
    assert.equal(message.source, "simulation");
    assert.equal(typeof message.id, "string");
    assert.equal(
      (
        await f.request("/api/simulation/message", {
          author: "",
          text: "Invalid author",
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await f.request("/api/simulation/message", {
          author: "viewer",
          text: "   ",
        })
      ).statusCode,
      400,
    );
    assert.equal(f.room.state.messages.length, 1);
  } finally {
    await f.app.close();
  }
});

test("shutdown closes live streams without leaving the server waiting", async () => {
  const f = await fixture();
  try {
    const address = await f.app.listen({ port: 0, host: "127.0.0.1" });
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const request = get(
        `${address}/api/events`,
        { headers: { host: "localhost:5173" } },
        resolve,
      );
      request.on("error", reject);
      request.setTimeout(2000, () =>
        request.destroy(new Error("Stream did not close")),
      );
    });
    assert.equal(response.statusCode, 200);
    const reader = response[Symbol.asyncIterator]();
    await reader.next();
    await f.app.close();
    assert.equal((await reader.next()).done, true);
    assert.equal(f.room.listenerCount("state"), 0);
    assert.equal(f.room.listenerCount("shutdown"), 0);
  } finally {
    await f.app.close();
  }
});

test("news settings validate, merge, and expose only configured model choices", async () => {
  const reasoning = process.env.BEDROCK_REASONING_MODEL_ID,
    fast = process.env.BEDROCK_MODEL_ID;
  process.env.BEDROCK_REASONING_MODEL_ID = "test-reasoning";
  process.env.BEDROCK_MODEL_ID = "test-fast";
  const f = await fixture();
  try {
    const response = await f.request("/api/settings", {
      coverage: {
        model: "fast",
        summary: "brief",
        minimumParticipants: 3,
        quotes: false,
      },
    });
    assert.equal(response.statusCode, 200);
    const bootstrap = (await f.request("/api/bootstrap")).json();
    assert.equal(bootstrap.state.coverage.summary, "brief");
    assert.equal(bootstrap.state.coverage.contextSeconds, 180);
    assert.equal(bootstrap.state.model, "test-fast");
    assert.deepEqual(bootstrap.coverageModels, [
      { value: "reasoning", label: "test-reasoning" },
      { value: "fast", label: "test-fast" },
    ]);
    for (const coverage of [
      { model: "arbitrary-model" },
      { summary: "long" },
      { maxStories: 100 },
      { minimumParticipants: 0 },
      { contextSeconds: -1 },
      { lifetimeSeconds: 0 },
      { quotes: "yes" },
      { unknown: true },
    ]) {
      assert.equal(
        (await f.request("/api/settings", { coverage })).statusCode,
        400,
      );
    }
    f.room.state.working = true;
    assert.equal(
      (await f.request("/api/settings", { coverage: { tone: "neutral" } }))
        .statusCode,
      400,
    );
    assert.equal(f.room.state.coverage.tone, "playful");
  } finally {
    await f.app.close();
    if (reasoning === undefined) delete process.env.BEDROCK_REASONING_MODEL_ID;
    else process.env.BEDROCK_REASONING_MODEL_ID = reasoning;
    if (fast === undefined) delete process.env.BEDROCK_MODEL_ID;
    else process.env.BEDROCK_MODEL_ID = fast;
  }
});

test("audio uploads reject stale source identity before transcription", async () => {
  const f = await fixture();
  try {
    const response = await f.app.inject({
      method: "POST",
      url: "/api/audio",
      headers: {
        host: "localhost:5173",
        "content-type": "audio/wav",
        "x-chyron-source": "stale-source",
      },
      payload: Buffer.from([1, 2, 3]),
    });
    assert.equal(response.statusCode, 400);
    assert.equal(
      response.json().error,
      "Audio source changed. Start capture again.",
    );
    assert.equal(f.room.state.messages.length, 0);
  } finally {
    await f.app.close();
  }
});

test("simulator rejects real-chat mode and invalid configuration without starting a model", async () => {
  const f = await fixture();
  try {
    const wrongSource = await f.request("/api/simulation/start", {
      topic: "Test discussion",
      users: 3,
      messages: 12,
      intervalMs: 1500,
      model: "fast",
    });
    assert.equal(wrongSource.statusCode, 400);
    assert.equal(wrongSource.json().error, "Select Simulation first.");
    const invalid = await f.request("/api/simulation/start", {
      topic: "test",
      users: 100,
      messages: 1000,
      intervalMs: 1,
      model: "fast",
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(f.room.state.simulator.status, "idle");
    assert.equal((await f.request("/api/simulation/stop", {})).statusCode, 200);
  } finally {
    await f.app.close();
  }
});

test("retired publishing, pinning, manual generation and scenario controls cannot be enabled", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (await f.request("/api/settings", { automatic: false })).statusCode,
      400,
    );
    assert.equal(
      (await f.request("/api/settings", { coverage: { generation: "manual" } }))
        .statusCode,
      400,
    );
    assert.equal((await f.request("/api/coverage", {})).statusCode, 404);
    assert.equal(
      (await f.request("/api/simulation", { scenario: "keyboard" })).statusCode,
      404,
    );
    for (const action of ["publish", "unpublish", "pin", "edit"]) {
      assert.equal(
        (await f.request("/api/stories/unused", { action })).statusCode,
        400,
      );
    }
    assert.equal(f.room.state.stories.length, 0);
  } finally {
    await f.app.close();
  }
});

test("pausing invalidates in-flight audio even after coverage resumes", async () => {
  const f = await fixture();
  try {
    const before = f.room.state.sourceId;
    assert.equal(
      (await f.request("/api/settings", { paused: true })).statusCode,
      200,
    );
    assert.notEqual(f.room.state.sourceId, before);
    assert.equal(
      (await f.request("/api/settings", { paused: false })).statusCode,
      200,
    );
    assert.notEqual(f.room.state.sourceId, before);
  } finally {
    await f.app.close();
  }
});

test("summary source switches can change during generation while other configuration stays protected", async () => {
  const f = await fixture();
  process.env.BEDROCK_REASONING_MODEL_ID = "test-reasoning-model";
  try {
    f.room.state.working = true;
    const disabled = await f.request("/api/settings", { coverage: { includeChat: false, includeAudio: false } });
    assert.equal(disabled.statusCode, 200, disabled.body);
    assert.equal(f.room.state.coverage.includeChat, false);
    assert.equal(f.room.state.coverage.includeAudio, false);
    const enabled = await f.request("/api/settings", { coverage: { includeChat: true, includeAudio: true } });
    assert.equal(enabled.statusCode, 200, enabled.body);
    const configuration = await f.request("/api/settings", { coverage: { tone: "neutral" } });
    assert.ok(configuration.statusCode >= 400);
  } finally { f.room.state.working = false; await f.app.close(); }
});
