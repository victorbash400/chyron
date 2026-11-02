import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import WebSocket from "ws";
import { records } from "../server/hosted/records.ts";
import { tokenHash } from "../server/hosted/sessions.ts";
import { broadcastSecret } from "../server/broadcast/secret.ts";
import { encryptStreamKey } from "../server/broadcast/crypto.ts";
import { awsLookup } from "../server/aws-dns.ts";
const url = process.env.BROADCAST_RELAY_URL!;
assert.ok(url?.startsWith("wss://"));
async function rejected(origin: string, token: string) {
  return new Promise<number>((resolve, reject) => {
    const ws = new WebSocket(url, [`chyron.${token}`], {
      headers: { Origin: origin },
      lookup: awsLookup,
      family: 4,
      handshakeTimeout: 15000,
    });
    ws.on("error", () => {});
    ws.on("unexpected-response", (_request, response) => {
      response.resume();
      resolve(response.statusCode!);
      ws.terminate();
    });
    ws.on("open", () => {
      ws.close();
      reject(new Error("Invalid broadcast access was accepted"));
    });
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error("Relay rejection timed out"));
    }, 16000);
    ws.on("close", () => clearTimeout(timer));
  });
}
assert.equal(
  await rejected("https://wrong.example", randomBytes(32).toString("hex")),
  403,
);
assert.equal(
  await rejected(process.env.APP_ORIGIN!, randomBytes(32).toString("hex")),
  401,
);
const token = randomBytes(32).toString("hex");
const key = { pk: `BROADCAST#${tokenHash(token)}`, sk: "TOKEN" };
try {
  await records.put(
    key,
    {
      userId: `relay-check-${randomUUID()}`,
      envelope: encryptStreamKey(
        "integration-only-invalid-key",
        await broadcastSecret(),
      ),
      test: true,
    },
    { expiresAt: Math.floor(Date.now() / 1000) + 60 },
  );
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url, [`chyron.${token}`], {
      headers: { Origin: process.env.APP_ORIGIN! },
      lookup: awsLookup,
      family: 4,
      handshakeTimeout: 15000,
    });
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("Relay acceptance timed out"));
    }, 16000);
    ws.on("error", reject);
    let accepted = false;
    ws.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "ready") {
        accepted = true;
        ws.send(JSON.stringify({ type: "stop" }));
      }
      if (message.type === "error" || message.type === "ended") {
        assert.equal(accepted, true);
        clearTimeout(timer);
        ws.close();
        resolve();
      }
    });
  });
  assert.equal(await records.get(key), undefined);
  assert.equal(await rejected(process.env.APP_ORIGIN!, token), 401);
  console.log(
    "Relay integration passed: private origin, WSS, origin rejection, credential decryption, scoped database access, encoder startup, one-time tickets and replay rejection. No media was transmitted to Twitch.",
  );
} finally {
  await records.remove(key);
}
