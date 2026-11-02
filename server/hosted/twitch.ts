import { z } from "zod";
import type { StreamerAccount } from "../../shared/session.ts";
import { origin, required } from "../config.ts";
import { seal } from "../store.ts";
import { records } from "./records.ts";
import { changeRoom } from "./rooms.ts";
import { resetSource } from "./settings.ts";
import { HttpError } from "./http.ts";
const scopes = ["user:read:chat", "user:bot", "channel:bot"];
const types = [
  "channel.chat.message",
  "channel.chat.message_delete",
  "channel.chat.clear",
  "channel.chat.clear_user_messages",
];
const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
});
const subscriptionSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  condition: z.object({ broadcaster_user_id: z.string() }).passthrough(),
  transport: z.object({ method: z.string(), callback: z.string().optional() }),
});
export const callbackUrl = () => `${origin()}/api/twitch/callback`;
export const webhookUrl = () => `${origin()}/api/twitch/events`;
let appToken: { token: string; expires: number } | undefined;
async function request(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new HttpError(
      response.status >= 500 ? 503 : 400,
      `Twitch connection failed (${response.status}). Connect again.`,
    );
  return response;
}
async function applicationToken() {
  if (appToken && appToken.expires > Date.now() + 60000) return appToken.token;
  const response = await request("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: required("TWITCH_CLIENT_ID"),
      client_secret: required("TWITCH_CLIENT_SECRET"),
      grant_type: "client_credentials",
    }),
  });
  const result = tokenSchema.parse(await response.json());
  appToken = {
    token: result.access_token,
    expires: Date.now() + result.expires_in * 1000,
  };
  return appToken.token;
}
export function authorizationUrl(state: string) {
  const url = new URL("https://id.twitch.tv/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: required("TWITCH_CLIENT_ID"),
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: scopes.join(" "),
    state,
  }).toString();
  return url.href;
}
export async function exchangeCode(code: string): Promise<StreamerAccount> {
  const response = await request("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: required("TWITCH_CLIENT_ID"),
      client_secret: required("TWITCH_CLIENT_SECRET"),
      grant_type: "authorization_code",
      redirect_uri: callbackUrl(),
      code,
    }),
  });
  const token = tokenSchema.parse(await response.json());
  const validation = await request("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${token.access_token}` },
  });
  const valid = z
    .object({
      client_id: z.string(),
      user_id: z.string(),
      scopes: z.array(z.string()),
    })
    .parse(await validation.json());
  if (
    valid.client_id !== required("TWITCH_CLIENT_ID") ||
    !scopes.every((scope) => valid.scopes.includes(scope))
  )
    throw new HttpError(403, "Authorize Twitch chat access.");
  const userResponse = await request("https://api.twitch.tv/helix/users", {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Client-Id": required("TWITCH_CLIENT_ID"),
    },
  });
  const user = z
    .object({
      data: z
        .array(
          z.object({
            id: z.string(),
            login: z.string(),
            display_name: z.string(),
            profile_image_url: z.string(),
          }),
        )
        .min(1),
    })
    .parse(await userResponse.json()).data[0];
  if (user.id !== valid.user_id)
    throw new HttpError(403, "Twitch account does not match authorization.");
  const account = {
    id: user.id,
    login: user.login,
    name: user.display_name,
    avatarUrl: user.profile_image_url,
  };
  await records.put(
    { pk: `USER#${account.id}`, sk: "TWITCH" },
    seal({ ...token, expiresAt: Date.now() + token.expires_in * 1000 }),
  );
  return account;
}
async function subscriptions(userId: string) {
  const token = await applicationToken();
  const results: z.infer<typeof subscriptionSchema>[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL("https://api.twitch.tv/helix/eventsub/subscriptions");
    url.searchParams.set("user_id", userId);
    if (cursor) url.searchParams.set("after", cursor);
    const response = await request(url.href, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": required("TWITCH_CLIENT_ID"),
      },
    });
    const page = z
      .object({
        data: z.array(subscriptionSchema),
        pagination: z.object({ cursor: z.string().optional() }),
      })
      .parse(await response.json());
    results.push(...page.data);
    cursor = page.pagination.cursor;
  } while (cursor);
  return results.filter(
    (subscription) =>
      subscription.transport.method === "webhook" &&
      subscription.transport.callback === webhookUrl() &&
      subscription.condition.broadcaster_user_id === userId &&
      types.includes(subscription.type),
  );
}
export async function connectStream(account: StreamerAccount) {
  const token = await applicationToken();
  const existing = await subscriptions(account.id);
  for (const type of types) {
    const subscribed = existing.find(
      (subscription) =>
        subscription.type === type &&
        ["enabled", "webhook_callback_verification_pending"].includes(
          subscription.status,
        ),
    );
    if (subscribed) continue;
    for (const stale of existing.filter(
      (subscription) => subscription.type === type,
    )) {
      await request(
        `https://api.twitch.tv/helix/eventsub/subscriptions?id=${encodeURIComponent(stale.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Client-Id": required("TWITCH_CLIENT_ID"),
          },
        },
      );
    }
    await request("https://api.twitch.tv/helix/eventsub/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": required("TWITCH_CLIENT_ID"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        version: "1",
        condition: { broadcaster_user_id: account.id, user_id: account.id },
        transport: {
          method: "webhook",
          callback: webhookUrl(),
          secret: required("TWITCH_WEBHOOK_SECRET"),
        },
      }),
    });
  }
  const verified = await subscriptions(account.id);
  const connected = types.every((type) =>
    verified.some(
      (subscription) =>
        subscription.type === type && subscription.status === "enabled",
    ),
  );
  return changeRoom(account.id, (room) => {
    if (room.state.mode !== "twitch") resetSource(room, "twitch");
    room.state.channel = { id: account.id, name: account.name };
    room.state.connection = connected ? "connected" : "connecting";
    room.state.error = null;
  });
}
export async function disconnectStream(userId: string) {
  const token = await applicationToken();
  for (const subscription of await subscriptions(userId)) {
    const url = new URL("https://api.twitch.tv/helix/eventsub/subscriptions");
    url.searchParams.set("id", subscription.id);
    await request(url.href, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": required("TWITCH_CLIENT_ID"),
      },
    });
  }
  await changeRoom(userId, (room) => {
    room.state.connection = "disconnected";
  });
}

export async function refreshStream(userId: string) {
  const verified = await subscriptions(userId);
  if (
    types.every((type) =>
      verified.some(
        (subscription) =>
          subscription.type === type && subscription.status === "enabled",
      ),
    )
  ) {
    return changeRoom(userId, (room) => {
      if (room.state.connection === "connecting")
        room.state.connection = "connected";
    });
  }
  return null;
}
