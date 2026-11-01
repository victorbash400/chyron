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
          { automatic: true },
          { origin: "https://foreign.example" },
        )
      ).statusCode,
      403,
    );
    assert.equal(f.room.state.automatic, false);
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
      (await f.request("/api/simulation", { scenario: "keyboard" })).statusCode,
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
      (await f.request("/api/simulation", { scenario: "keyboard" })).statusCode,
      200,
    );
    assert.ok(f.room.state.messages.every((m) => m.source === "simulation"));
    assert.equal(
      (await f.request("/api/settings", { automatic: "yes" })).statusCode,
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
    assert.equal(f.room.state.automatic, false);
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
      const response = await f.request("/api/settings", {
        design: { style: style.id, color: style.color },
      });
      assert.equal(response.statusCode, 200);
      const overlay = (
        await f.request(`/api/overlay/${f.room.overlayToken}`)
      ).json();
      assert.equal(overlay.design.style, style.id);
      assert.equal(overlay.design.color, style.color);
    }
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
