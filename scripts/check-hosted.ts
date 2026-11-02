import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import WebSocket from "ws";
import { awsLookup } from "../server/aws-dns.ts";
import { getDatabase, records, tableName } from "../server/hosted/records.ts";
import {
  ensureRoom,
  appendMessage,
  getRoom,
  changeRoom,
  acquireCoverage,
  releaseCoverage,
} from "../server/hosted/rooms.ts";
import { AccountSessions, tokenHash } from "../server/hosted/sessions.ts";
import {
  accountConnection,
  overlayConnection,
  publishRoom,
} from "../server/hosted/realtime.ts";
import { handleRequest } from "../server/hosted/handler.ts";
assert.equal(
  tableName(),
  "Chyron-prod",
  "Use the isolated production table for this integration check.",
);
const id = `integration-${randomUUID()}`;
const account = { id, name: "Integration test" };
const other = { id: `${id}-other`, name: "Other integration account" };
const cleanupKeys: { pk: string; sk: string }[] = [];
const sockets: WebSocket[] = [];
let work: Promise<unknown>[] = [];
const dispatch = (request: Request) =>
  process.argv.includes("--remote")
    ? fetch(request, { signal: AbortSignal.timeout(30000) })
    : handleRequest(request, (promise) => work.push(promise));
try {
  const room = await ensureRoom(account);
  const otherRoom = await ensureRoom(other);
  cleanupKeys.push(
    ...[room, otherRoom].map((value) => ({
      pk: `OVERLAY#${tokenHash(value.overlayToken)}`,
      sk: "TOKEN",
    })),
  );
  const sessions = new AccountSessions();
  const first = await sessions.create(account);
  const second = await sessions.create(other);
  for (const session of [first, second])
    cleanupKeys.push({
      pk: `SESSION#${tokenHash(session.cookie.split("=")[1].split(";")[0])}`,
      sk: "TOKEN",
    });
  const message = {
    id: randomUUID(),
    userId: "test-viewer",
    author: "Test viewer",
    text: "Integration test message",
    at: Date.now(),
    source: "chat" as const,
  };
  assert.equal(await appendMessage(id, room, message), true);
  assert.equal(await appendMessage(id, room, message), false);
  assert.equal((await getRoom(id)).state.messages.length, 1);
  assert.equal((await getRoom(other.id)).state.messages.length, 0);
  const leases = await Promise.all([
    acquireCoverage(id, "first"),
    acquireCoverage(id, "second"),
  ]);
  assert.equal(leases.filter(Boolean).length, 1);
  await releaseCoverage(id, leases[0] ? "first" : "second");
  await Promise.all([
    changeRoom(id, (current) => {
      current.state.visible = false;
    }),
    changeRoom(id, (current) => {
      current.state.design.speed = 34;
    }),
  ]);
  assert.equal((await getRoom(id)).state.visible, false);
  assert.equal((await getRoom(id)).state.design.speed, 34);
  const request = (path: string, cookie: string) =>
    new Request(`${process.env.APP_ORIGIN}${path}`, { headers: { cookie } });
  const firstBootstrap = await dispatch(
    request("/api/bootstrap", first.cookie),
  );
  const secondBootstrap = await dispatch(
    request("/api/bootstrap", second.cookie),
  );
  assert.equal(firstBootstrap.status, 200);
  assert.equal(secondBootstrap.status, 200);
  const a = await firstBootstrap.json(),
    b = await secondBootstrap.json();
  assert.equal(a.state.channel.id, id);
  assert.equal(b.state.channel.id, other.id);
  assert.equal(a.state.messages.length, 1);
  assert.equal(b.state.messages.length, 0);
  const overlay = await handleRequest(
    new Request(`${process.env.APP_ORIGIN}/api/overlay/${room.overlayToken}`),
    (promise) => work.push(promise),
  );
  const publicData = await overlay.json();
  assert.equal(overlay.status, 200);
  for (const privateKey of [
    "messages",
    "channel",
    "error",
    "overlayToken",
    "account",
  ])
    assert.equal(privateKey in publicData, false);
  const connection = await accountConnection(first.session);
  cleanupKeys.push({
    pk: `CAPABILITY#${tokenHash(connection.token.slice(8))}`,
    sk: "TOKEN",
  });
  const connect = (channel: string, token = connection.token) =>
    new Promise<{ ws: WebSocket; message: Record<string, unknown> }>(
      (resolve, reject) => {
        const authorization = { host: connection.host, Authorization: token };
        const header = Buffer.from(JSON.stringify(authorization)).toString(
          "base64url",
        );
        const ws = new WebSocket(
          connection.url,
          ["aws-appsync-event-ws", `header-${header}`],
          { lookup: awsLookup, family: 4, handshakeTimeout: 10000 },
        );
        sockets.push(ws);
        const timer = setTimeout(() => {
          ws.close();
          reject(new Error("Realtime handshake timed out"));
        }, 15000);
        ws.on("open", () =>
          ws.send(JSON.stringify({ type: "connection_init" })),
        );
        ws.on("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        ws.on("message", (raw) => {
          const message = JSON.parse(raw.toString());
          if (message.type === "connection_ack")
            ws.send(
              JSON.stringify({
                type: "subscribe",
                id: "test",
                channel,
                authorization,
              }),
            );
          else if (
            [
              "subscribe_success",
              "subscribe_error",
              "error",
              "connection_error",
            ].includes(message.type)
          ) {
            clearTimeout(timer);
            resolve({ ws, message });
          }
        });
      },
    );
  console.log("Database isolation and concurrency passed; checking realtime.");
  const valid = await connect(connection.channel);
  assert.equal(
    valid.message.type,
    "subscribe_success",
    JSON.stringify(valid.message),
  );
  const crossed = await connect(`/newsroom/${other.id}`);
  assert.equal(
    crossed.message.type,
    "subscribe_error",
    JSON.stringify(crossed.message),
  );
  const wildcard = await connect("/newsroom/*");
  assert.equal(
    wildcard.message.type,
    "subscribe_error",
    JSON.stringify(wildcard.message),
  );
  const capability = overlayConnection(id, room.overlayToken);
  const obs = await connect(capability.channel, capability.token);
  assert.equal(
    obs.message.type,
    "subscribe_success",
    JSON.stringify(obs.message),
  );
  const next = new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Realtime publish timed out")),
      10000,
    );
    valid.ws.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "data") {
        clearTimeout(timer);
        resolve(message);
      }
    });
  });
  await publishRoom(id);
  const event = await next;
  const payload =
    typeof event.event === "string"
      ? event.event
      : (event.event as string[])[0];
  assert.deepEqual(Object.keys(JSON.parse(payload)), ["revision"]);
  if (process.argv.includes("--models")) {
    assert.ok(process.argv.includes("--remote"), "Model check targets the deployed function.");
    const mutate = async (path: string, body: unknown) => {
      const response = await dispatch(new Request(`${process.env.APP_ORIGIN}${path}`, { method: "POST", headers: { cookie: first.cookie, origin: process.env.APP_ORIGIN!, "content-type": "application/json" }, body: JSON.stringify(body) }));
      assert.ok(response.ok, `${path}: ${response.status} ${await response.text()}`);
    };
    await mutate("/api/settings", { coverage: { newsworthiness: "all", minimumMessages: 3, minimumParticipants: 2, updateDelayMs: 800 } });
    await mutate("/api/mode", { mode: "simulation" });
    const completion = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Hosted simulation timed out")), 120000);
      const inspect = async () => {
        try {
          const current = await getRoom(id);
          if (current.state.error) throw new Error(current.state.error);
          if (current.state.simulator.delivered === 12 && current.state.stories.length > 0 && !current.state.working) {
            clearTimeout(timeout); valid.ws.off("message", listener); resolve();
          }
        } catch (error) { clearTimeout(timeout); valid.ws.off("message", listener); reject(error); }
      };
      const listener = (raw: WebSocket.RawData) => { if (JSON.parse(raw.toString()).type === "data") void inspect(); };
      valid.ws.on("message", listener);
    });
    void completion.catch(() => {});
    await mutate("/api/simulation/start", { topic: "Three fictional viewers discuss a chess match where an underdog wins after a surprising queen sacrifice", users: 3, messages: 12, intervalMs: 500, model: "fast" });
    await completion;
    console.log("Hosted model flow passed: Vercel OIDC, AWS simulation, automatic coverage, stories and live updates.");
  }
  await sessions.logout(new Headers({ cookie: first.cookie }));
  assert.equal(
    await sessions.read(new Headers({ cookie: first.cookie })),
    null,
  );
  assert.ok(await sessions.read(new Headers({ cookie: second.cookie })));
  assert.ok(
    (
      await handleRequest(
        new Request(
          `${process.env.APP_ORIGIN}/api/overlay/${room.overlayToken}`,
        ),
        (promise) => work.push(promise),
      )
    ).ok,
  );
  console.log(
    "Production integration passed: account isolation, message dedupe, concurrent updates, coverage lease, private API, overlay privacy, authenticated realtime, cross-account/wildcard rejection, IAM publish and session logout.",
  );
} finally {
  for (const socket of sockets) socket.close();
  await Promise.allSettled(work);
  for (const userId of [id, other.id]) {
    const rows = await getDatabase().send(
      new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": `USER#${userId}` },
      }),
    );
    cleanupKeys.push(
      ...(rows.Items ?? []).map((item) => ({ pk: item.pk, sk: item.sk })),
    );
  }
  const removed = await Promise.allSettled(
    cleanupKeys.map((Key) =>
      getDatabase().send(new DeleteCommand({ TableName: tableName(), Key })),
    ),
  );
  for (const result of removed)
    if (result.status === "rejected") throw result.reason;
}
