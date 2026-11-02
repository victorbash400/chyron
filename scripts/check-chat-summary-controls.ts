import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { AccountSessions, tokenHash } from "../server/hosted/sessions.ts";
import {
  ensureRoom,
  acquireCoverage,
  releaseCoverage,
  changeRoom,
} from "../server/hosted/rooms.ts";
import { getDatabase, records, tableName } from "../server/hosted/records.ts";
import { connectRealtime } from "../src/state/realtime.ts";
import type { Bootstrap } from "../shared/types.ts";
import type { CoverageSettings } from "../shared/coverageSettings.ts";

const origin = new URL(process.env.CHECK_DEPLOYMENT_URL!).origin;
assert.ok(origin.startsWith("https://"));
const account = {
  id: `qa-summary-${randomUUID()}`,
  name: "Summary verification",
};
const sessions = new AccountSessions();
const nativeFetch = globalThis.fetch;
let headers: Headers | undefined;
let overlayToken: string | undefined;
let disconnect: (() => void) | undefined;
let timeout: ReturnType<typeof setTimeout> | undefined;
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await nativeFetch(new URL(path, origin), {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: headers!.get("cookie")!,
      Origin: origin,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  assert.ok(
    response.ok,
    `${path}: ${response.status} ${JSON.stringify(result)}`,
  );
  return result as T;
}
try {
  const room = await ensureRoom(account);
  overlayToken = room.overlayToken;
  const created = await sessions.create(account);
  headers = new Headers({ Cookie: created.cookie.split(";")[0]! });
  await changeRoom(account.id, (current) => {
    delete (current.state.coverage as Partial<CoverageSettings>).includeChat;
  });
  assert.equal(
    (await request<Bootstrap>("/api/bootstrap")).state.coverage.includeChat,
    true,
  );
  await request("/api/mode", { mode: "simulation" });
  await request("/api/settings", {
    coverage: {
      model: "fast",
      minimumMessages: 3,
      includeChat: false,
      includeAudio: false,
    },
  });
  const owner = randomUUID();
  assert.ok(await acquireCoverage(account.id, owner));
  try {
    await request("/api/settings", {
      coverage: { includeChat: true, includeAudio: true },
    });
    const both = (await request<Bootstrap>("/api/bootstrap")).state;
    assert.equal(both.coverage.includeChat, true);
    assert.equal(both.coverage.includeAudio, true);
    await request("/api/settings", {
      coverage: { includeChat: false, includeAudio: false },
    });
  } finally {
    await releaseCoverage(account.id, owner);
  }
  for (const [author, text] of [
    ["Ada", "You spent 300 dollars on a keyboard without backlighting?"],
    ["Bea", "For 300 dollars those keys should do my taxes."],
    ["Cam", "It sounds great but I cannot defend the price."],
  ])
    await request("/api/simulation/message", { author, text });
  const off = (await request<Bootstrap>("/api/bootstrap")).state;
  assert.equal(off.messages.length, 3);
  assert.equal(off.stories.length, 0);
  assert.equal(off.working, false);
  globalThis.fetch = (input, init) => {
    if (typeof input !== "string" || !input.startsWith("/api/"))
      return nativeFetch(input, init);
    const auth = new Headers(init?.headers);
    auth.set("Cookie", headers!.get("cookie")!);
    return nativeFetch(new URL(input, origin), { ...init, headers: auth });
  };
  let ready!: () => void;
  let finished!: () => void;
  let failed!: (error: Error) => void;
  const connected = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const updated = new Promise<void>((resolve, reject) => {
    finished = resolve;
    failed = reject;
  });
  timeout = setTimeout(
    () => failed(new Error("Summary update did not arrive within 90 seconds.")),
    90000,
  );
  disconnect = connectRealtime(
    "/api/realtime",
    async () => {
      const state = (await request<Bootstrap>("/api/bootstrap")).state;
      if (state.error) failed(new Error(state.error));
      if (state.stories.length) finished();
    },
    ready,
    (message) => failed(new Error(message)),
  );
  await Promise.race([connected, updated]);
  await request("/api/settings", { coverage: { includeChat: true } });
  await updated;
  await request("/api/settings", {
    coverage: { includeChat: false, includeAudio: false },
  });
  const final = (await request<Bootstrap>("/api/bootstrap")).state;
  assert.equal(final.coverage.includeChat, false);
  assert.equal(final.coverage.includeAudio, false);
  assert.equal(final.messages.length, 3);
  console.log(
    JSON.stringify({
      result: "passed",
      sourceSwitchesDuringGeneration: true,
      messagesPreserved: final.messages.length,
      headline: final.stories[0].headline,
    }),
  );
} finally {
  clearTimeout(timeout);
  disconnect?.();
  globalThis.fetch = nativeFetch;
  if (headers) await sessions.logout(headers);
  if (overlayToken)
    await records.remove({
      pk: `OVERLAY#${tokenHash(overlayToken)}`,
      sk: "TOKEN",
    });
  const rows = await getDatabase().send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": `USER#${account.id}` },
      ProjectionExpression: "pk, sk",
      ConsistentRead: true,
    }),
  );
  for (const row of rows.Items ?? [])
    await records.remove({ pk: row.pk, sk: row.sk });
}
