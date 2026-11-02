import { randomBytes } from "node:crypto";
import { z } from "zod";
import { tokenHash } from "./sessions.ts";
import { records } from "./records.ts";
import { origin, required } from "../config.ts";
import { encryptStreamKey } from "../broadcast/crypto.ts";
import { broadcastSecret } from "../broadcast/secret.ts";
import {
  getBroadcastKey,
  hasBroadcastAccess,
  channelIsLive,
} from "./twitch.ts";
import { HttpError, json, jsonBody } from "./http.ts";
export interface RelayTicketRecord {
  userId: string;
  envelope: string;
  test: boolean;
}
export async function broadcastRoute(request: Request, userId: string) {
  const path = new URL(request.url).pathname;
  const configured = Boolean(
    process.env.BROADCAST_RELAY_URL && process.env.BROADCAST_SECRET_ARN,
  );
  if (path === "/api/broadcast" && request.method === "GET")
    return json({ configured, authorized: await hasBroadcastAccess(userId) });
  if (path !== "/api/broadcast/start" || request.method !== "POST") return null;
  if (!configured)
    throw new HttpError(503, "Browser broadcasting is unavailable.");
  const { test } = z
    .object({ test: z.boolean() })
    .strict()
    .parse(await jsonBody(request));
  if (await channelIsLive(userId))
    throw new HttpError(
      409,
      "Channel already live. Stop its current broadcast first.",
    );
  const streamKey = await getBroadcastKey(userId);
  const token = randomBytes(32).toString("hex");
  await records.put(
    { pk: `BROADCAST#${tokenHash(token)}`, sk: "TOKEN" },
    {
      userId,
      envelope: encryptStreamKey(streamKey, await broadcastSecret()),
      test,
    } satisfies RelayTicketRecord,
    { expiresAt: Math.floor(Date.now() / 1000) + 60, onlyIfAbsent: true },
  );
  const url = new URL(required("BROADCAST_RELAY_URL"));
  if (url.protocol !== "wss:" || new URL(origin()).protocol !== "https:")
    throw new HttpError(503, "Secure broadcasting is unavailable.");
  return json({ url: url.href, token });
}
