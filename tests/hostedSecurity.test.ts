import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validWebhook } from "../server/hosted/webhook.ts";
import { checkOrigin, handleRequest } from "../server/hosted/handler.ts";
process.env.APP_ORIGIN = "https://chyron.example";
process.env.COOKIE_SECRET = "test-only-cookie-secret";
test("Twitch webhook signature binds the body, event ID and fresh timestamp", () => {
  const now = Date.now(),
    timestamp = new Date(now).toISOString(),
    raw = JSON.stringify({ event: { broadcaster_user_id: "a" } });
  const signature = `sha256=${createHmac("sha256", "test-secret")
    .update("event-id" + timestamp + raw)
    .digest("hex")}`;
  const headers = new Headers({
    "twitch-eventsub-message-id": "event-id",
    "twitch-eventsub-message-timestamp": timestamp,
    "twitch-eventsub-message-signature": signature,
  });
  assert.equal(validWebhook(headers, raw, "test-secret", now), true);
  assert.equal(validWebhook(headers, raw + " ", "test-secret", now), false);
  assert.equal(validWebhook(headers, raw, "wrong-secret", now), false);
  assert.equal(validWebhook(headers, raw, "test-secret", now + 600001), false);
  assert.equal(validWebhook(headers, raw, "test-secret", now - 600001), false);
  headers.set("twitch-eventsub-message-id", "replaced-id");
  assert.equal(validWebhook(headers, raw, "test-secret", now), false);
});
test("hosted mutations reject missing and foreign origins before session or data access", async () => {
  for (const origin of [undefined, "https://attacker.example"]) {
    const request = new Request("https://chyron.example/api/settings", {
      method: "POST",
      headers: origin ? { origin } : {},
    });
    assert.throws(() => checkOrigin(request));
    assert.equal(
      (await handleRequest(request, () => assert.fail("No background work")))
        .status,
      403,
    );
  }
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request("https://chyron.example/api/settings", {
        method: "POST",
        headers: { origin: "https://chyron.example" },
      }),
    ),
  );
});
test("private cloud routes require a session and do not trust body-selected accounts", async () => {
  const clear = await handleRequest(
    new Request("https://chyron.example/api/chat/clear", {
      method: "POST",
      headers: { origin: "https://chyron.example", "content-type": "application/json" },
      body: JSON.stringify({}),
    }),
    () => assert.fail("No background work"),
  );
  assert.equal(clear.status, 401);
  const response = await handleRequest(
    new Request("https://chyron.example/api/bootstrap?userId=someone-else"),
    () => assert.fail("No background work"),
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Sign in with Twitch." });
  const mutation = await handleRequest(
    new Request("https://chyron.example/api/settings", {
      method: "POST",
      headers: {
        origin: "https://chyron.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({ userId: "someone-else", visible: true }),
    }),
    () => assert.fail("No background work"),
  );
  assert.equal(mutation.status, 401);
});
