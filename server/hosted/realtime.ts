import { randomBytes } from "node:crypto";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { Agent, fetch as request } from "undici";
import type { RealtimeConnection } from "../../shared/session.ts";
import { credentials } from "../aws.ts";
import { awsLookup } from "../aws-dns.ts";
import { region, required } from "../config.ts";
import { records } from "./records.ts";
import { tokenHash, type AccountSession } from "./sessions.ts";
import { getMetadata } from "./rooms.ts";
const dispatcher = new Agent({
  connect: { lookup: awsLookup, family: 4, timeout: 10000 },
});
const host = () => required("REALTIME_HTTP_HOST");
function connection(channel: string, token: string): RealtimeConnection {
  return {
    url: `wss://${required("REALTIME_WS_HOST")}/event/realtime`,
    host: host(),
    channel,
    token,
  };
}
export async function accountConnection(session: AccountSession) {
  const token = randomBytes(32).toString("hex");
  await records.put(
    { pk: `CAPABILITY#${tokenHash(token)}`, sk: "TOKEN" },
    { userId: session.account.id, sessionId: session.id },
    {
      expiresAt: Math.min(
        session.expiresAt,
        Math.floor(Date.now() / 1000) + 900,
      ),
    },
  );
  return connection(`/newsroom/${session.account.id}`, `session:${token}`);
}
export function overlayConnection(userId: string, token: string) {
  return connection(`/overlay/${userId}`, `overlay:${token}`);
}
async function publish(channel: string, revision: number) {
  const body = JSON.stringify({
    channel,
    events: [JSON.stringify({ revision })],
  });
  const signer = new SignatureV4({
    service: "appsync",
    region: region(),
    credentials,
    sha256: Sha256,
  });
  const signed = await signer.sign({
    method: "POST",
    protocol: "https:",
    hostname: host(),
    path: "/event",
    headers: { host: host(), "content-type": "application/json" },
    body,
  });
  const response = await request(`https://${host()}/event`, {
    method: "POST",
    headers: signed.headers,
    body,
    dispatcher,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `Live update delivery failed (${response.status}). Reconnect.`,
    );
  const result = (await response.json()) as { failed?: unknown[] };
  if (result.failed?.length)
    throw new Error("Live update delivery failed. Reconnect.");
}
export async function publishRoom(userId: string) {
  const room = await getMetadata(userId);
  const results = await Promise.allSettled([
    publish(`/newsroom/${userId}`, room.revision),
    publish(`/overlay/${userId}`, room.revision),
  ]);
  for (const result of results)
    if (result.status === "rejected") throw result.reason;
}
