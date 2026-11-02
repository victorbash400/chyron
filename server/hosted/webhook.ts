import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { z } from "zod";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { required } from "../config.ts";
import { appendMessage, changeRoom, getRoom } from "./rooms.ts";
import { getDatabase, tableName } from "./records.ts";
import { HttpError } from "./http.ts";
import { webhookUrl } from "./twitch.ts";
const subscriptionSchema = z.object({
  type: z.enum([
    "channel.chat.message",
    "channel.chat.message_delete",
    "channel.chat.clear",
    "channel.chat.clear_user_messages",
  ]),
  condition: z.object({ broadcaster_user_id: z.string() }),
  transport: z.object({ method: z.literal("webhook"), callback: z.string() }),
});
export function validWebhook(
  headers: Headers,
  raw: string,
  secret: string,
  now = Date.now(),
) {
  const id = headers.get("twitch-eventsub-message-id");
  const timestamp = headers.get("twitch-eventsub-message-timestamp");
  const signature = headers.get("twitch-eventsub-message-signature");
  if (
    !id ||
    !timestamp ||
    !signature ||
    !Number.isFinite(Date.parse(timestamp)) ||
    Math.abs(now - Date.parse(timestamp)) > 600000
  )
    return false;
  const expected = Buffer.from(
    `sha256=${createHmac("sha256", secret)
      .update(id + timestamp + raw)
      .digest("hex")}`,
  );
  const supplied = Buffer.from(signature);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
export async function receiveWebhook(request: Request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 1000000)
    throw new HttpError(413, "Event too large.");
  if (!validWebhook(request.headers, raw, required("TWITCH_WEBHOOK_SECRET")))
    throw new HttpError(403, "Invalid Twitch signature.");
  const body = z
    .object({
      subscription: subscriptionSchema,
      challenge: z.string().optional(),
      event: z.unknown().optional(),
    })
    .parse(JSON.parse(raw));
  if (body.subscription.transport.callback !== webhookUrl())
    throw new HttpError(403, "Invalid Twitch callback.");
  const userId = body.subscription.condition.broadcaster_user_id;
  const kind = request.headers.get("twitch-eventsub-message-type");
  if (kind === "webhook_callback_verification") {
    if (!body.challenge) throw new HttpError(400, "Missing Twitch challenge.");
    return {
      response: new Response(body.challenge, {
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      }),
      userId: null,
    };
  }
  if (kind === "revocation") {
    await changeRoom(userId, (room) => {
      room.state.connection = "error";
      room.state.error = "Twitch chat access revoked. Connect Twitch again.";
    });
    return { response: new Response(null, { status: 204 }), userId };
  }
  if (kind !== "notification")
    throw new HttpError(400, "Unsupported Twitch event.");
  const event = z
    .object({ broadcaster_user_id: z.string() })
    .passthrough()
    .parse(body.event);
  if (event.broadcaster_user_id !== userId)
    throw new HttpError(403, "Twitch channel does not match.");
  const room = await getRoom(userId);
  if (room.state.mode !== "twitch" || room.state.connection === "disconnected")
    return { response: new Response(null, { status: 204 }), userId: null };
  if (room.state.connection !== "connected")
    await changeRoom(userId, (current) => {
      current.state.connection = "connected";
    });
  if (body.subscription.type === "channel.chat.message") {
    const message = z
      .object({
        message_id: z.string(),
        chatter_user_id: z.string(),
        chatter_user_name: z.string(),
        message: z.object({ text: z.string() }),
      })
      .parse(event);
    const at = Date.parse(
      request.headers.get("twitch-eventsub-message-timestamp")!,
    );
    const added = await appendMessage(userId, room, {
      id: message.message_id,
      userId: message.chatter_user_id,
      author: message.chatter_user_name,
      text: message.message.text,
      at,
      source: "chat",
    });
    return {
      response: new Response(null, { status: 204 }),
      userId: added ? userId : null,
    };
  }
  const deletedId =
    body.subscription.type === "channel.chat.message_delete"
      ? z.object({ message_id: z.string() }).parse(event).message_id
      : null;
  const deletedUser =
    body.subscription.type === "channel.chat.clear_user_messages"
      ? z.object({ target_user_id: z.string() }).parse(event).target_user_id
      : null;
  const removed = room.state.messages.filter(
    (message) =>
      message.source === "chat" &&
      (deletedId
        ? message.id === deletedId
        : deletedUser
          ? message.userId === deletedUser
          : true),
  );
  const ids = new Set(removed.map((message) => message.id));
  if (deletedId) ids.add(deletedId);
  await changeRoom(userId, (current) => {
    current.state.sourceId = randomUUID();
    for (const story of current.state.stories) {
      if (story.messageIds.some((id) => ids.has(id))) story.dismissed = true;
      if (story.quoteId && ids.has(story.quoteId)) story.quoteId = null;
    }
  });
  const results = await Promise.allSettled(
    removed.map((message) =>
      getDatabase().send(
        new DeleteCommand({
          TableName: tableName(),
          Key: {
            pk: `USER#${userId}`,
            sk: `MESSAGE#${room.conversationId}#${String(message.at).padStart(13, "0")}#${message.id}`,
          },
        }),
      ),
    ),
  );
  for (const result of results)
    if (result.status === "rejected") throw result.reason;
  return { response: new Response(null, { status: 204 }), userId };
}
