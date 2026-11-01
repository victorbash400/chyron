import WebSocket from "ws";
import { z } from "zod";
import { origin, required } from "./config.ts";
import {
  deleteRecord,
  readRecord,
  seal,
  unseal,
  writeRecord,
} from "./store.ts";
import type { Newsroom } from "./newsroom.ts";
const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});
const userSchema = z.object({
  data: z.array(z.object({ id: z.string(), display_name: z.string() })).min(1),
});
interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { id: string; name: string };
}
const envelope = z.object({
  metadata: z.object({
    message_type: z.string(),
    subscription_type: z.string().optional(),
  }),
  payload: z
    .object({
      session: z
        .object({
          id: z.string(),
          reconnect_url: z.string().nullable().optional(),
          keepalive_timeout_seconds: z.number().nullable().optional(),
        })
        .optional(),
      event: z.unknown().optional(),
    })
    .passthrough(),
});
const chatEvent = z.object({
  message_id: z.string(),
  chatter_user_id: z.string(),
  chatter_user_name: z.string(),
  message: z.object({ text: z.string() }),
});
const deletedEvent = z.object({ message_id: z.string() });
const clearUserEvent = z.object({ target_user_id: z.string() });
async function twitchRequest(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `Twitch request failed (${response.status}). Reconnect Twitch.`,
    );
  return response;
}
export class TwitchConnection {
  private socket: WebSocket | undefined;
  private credentials: Credentials | undefined;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private tokenExpiry: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  constructor(private newsroom: Newsroom) {}
  async loadConfiguration() {
    const saved = await readRecord<string>("TWITCH_APP");
    if (saved) {
      const app = z
        .object({ clientId: z.string(), clientSecret: z.string() })
        .parse(unseal(saved));
      process.env.TWITCH_CLIENT_ID = app.clientId;
      process.env.TWITCH_CLIENT_SECRET = app.clientSecret;
    }
  }
  async configure(clientId: string, clientSecret: string) {
    await writeRecord("TWITCH_APP", seal({ clientId, clientSecret }));
    process.env.TWITCH_CLIENT_ID = clientId;
    process.env.TWITCH_CLIENT_SECRET = clientSecret;
  }
  configured() {
    return Boolean(
      process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET,
    );
  }
  authorizationUrl(state: string) {
    const url = new URL("https://id.twitch.tv/oauth2/authorize");
    url.search = new URLSearchParams({
      client_id: required("TWITCH_CLIENT_ID"),
      redirect_uri: `${origin()}/api/twitch/callback`,
      response_type: "code",
      scope: "user:read:chat",
      state,
    }).toString();
    return url.href;
  }
  async authorize(code: string) {
    const response = await twitchRequest("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: required("TWITCH_CLIENT_ID"),
        client_secret: required("TWITCH_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
        redirect_uri: `${origin()}/api/twitch/callback`,
      }),
    });
    const tokens = tokenSchema.parse(await response.json());
    const userResponse = await twitchRequest(
      "https://api.twitch.tv/helix/users",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Client-Id": required("TWITCH_CLIENT_ID"),
        },
      },
    );
    const user = userSchema.parse(await userResponse.json()).data[0];
    this.credentials = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      user: { id: user.id, name: user.display_name },
    };
    await writeRecord("TWITCH", seal(this.credentials));
    await this.connect();
  }
  async connect() {
    this.disconnect();
    const stored = await readRecord<string>("TWITCH");
    if (!stored) throw new Error("Connect Twitch first.");
    this.credentials = unseal<Credentials>(stored);
    if (Date.now() > this.credentials.expiresAt - 60000) {
      const response = await twitchRequest(
        "https://id.twitch.tv/oauth2/token",
        {
          method: "POST",
          body: new URLSearchParams({
            client_id: required("TWITCH_CLIENT_ID"),
            client_secret: required("TWITCH_CLIENT_SECRET"),
            refresh_token: this.credentials.refreshToken,
            grant_type: "refresh_token",
          }),
        },
      );
      const tokens = tokenSchema.parse(await response.json());
      this.credentials = {
        ...this.credentials,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };
      await writeRecord("TWITCH", seal(this.credentials));
    }
    const validation = await twitchRequest(
      "https://id.twitch.tv/oauth2/validate",
      { headers: { Authorization: `OAuth ${this.credentials.accessToken}` } },
    );
    const valid = z
      .object({
        client_id: z.string(),
        user_id: z.string(),
        scopes: z.array(z.string()),
      })
      .parse(await validation.json());
    if (
      valid.client_id !== required("TWITCH_CLIENT_ID") ||
      valid.user_id !== this.credentials.user.id ||
      !valid.scopes.includes("user:read:chat")
    )
      throw new Error("Twitch authorization is invalid. Connect Twitch again.");
    if (
      this.newsroom.state.mode !== "twitch" ||
      this.newsroom.state.channel?.id !== this.credentials.user.id
    )
      await this.newsroom.reset("twitch");
    this.newsroom.state.channel = this.credentials.user;
    this.newsroom.state.connection = "connecting";
    this.newsroom.emitState();
    this.open("wss://eventsub.wss.twitch.tv/ws", false, this.generation);
    this.tokenExpiry = setTimeout(
      () => {
        this.disconnect();
        this.newsroom.fail(
          new Error("Twitch session validation due. Reconnect Twitch."),
        );
      },
      Math.min(55 * 60000, this.credentials.expiresAt - Date.now()),
    );
  }
  private open(url: string, migrating: boolean, generation: number) {
    const socket = new WebSocket(url);
    const previous = this.socket;
    this.socket = socket;
    let keepalive = 15000;
    const touch = () => {
      clearTimeout(this.watchdog);
      this.watchdog = setTimeout(() => {
        socket.close();
        this.newsroom.state.connection = "error";
        this.newsroom.fail(
          new Error("Twitch connection timed out. Reconnect Twitch."),
        );
      }, keepalive);
    };
    socket.on("message", (data) => {
      if (generation !== this.generation) return;
      void (async () => {
        const message = envelope.parse(JSON.parse(data.toString()));
        touch();
        if (message.metadata.message_type === "session_welcome") {
          const session = message.payload.session;
          if (!session) throw new Error("Twitch session was missing.");
          keepalive = ((session.keepalive_timeout_seconds ?? 10) + 5) * 1000;
          touch();
          if (!migrating) await this.subscribe(session.id);
          else previous?.close();
          this.newsroom.state.connection = "connected";
          await this.newsroom.commit();
        } else if (message.metadata.message_type === "session_reconnect") {
          const target = new URL(message.payload.session?.reconnect_url ?? "");
          if (
            target.protocol !== "wss:" ||
            target.hostname !== "eventsub.wss.twitch.tv"
          )
            throw new Error("Twitch supplied an invalid reconnect address.");
          this.open(target.href, true, generation);
        } else if (message.metadata.message_type === "revocation") {
          this.disconnect();
          throw new Error("Twitch access was revoked. Connect Twitch again.");
        } else if (message.metadata.message_type === "notification") {
          const type = message.metadata.subscription_type;
          if (type === "channel.chat.message") {
            const event = chatEvent.parse(message.payload.event);
            this.newsroom.add([
              {
                id: event.message_id,
                userId: event.chatter_user_id,
                author: event.chatter_user_name,
                text: event.message.text,
                at: Date.now(),
                source: "chat",
              },
            ]);
          } else if (type === "channel.chat.message_delete")
            await this.newsroom.removeMessages([
              deletedEvent.parse(message.payload.event).message_id,
            ]);
          else if (type === "channel.chat.clear")
            await this.newsroom.removeMessages(
              this.newsroom.state.messages
                .filter((m) => m.source === "chat")
                .map((m) => m.id),
            );
          else if (type === "channel.chat.clear_user_messages") {
            const event = clearUserEvent.parse(message.payload.event);
            await this.newsroom.removeMessages(
              this.newsroom.state.messages
                .filter((m) => m.userId === event.target_user_id)
                .map((m) => m.id),
            );
          }
        }
      })().catch((error) => {
        this.newsroom.state.connection = "error";
        this.newsroom.fail(error);
      });
    });
    socket.on("error", () => {
      if (generation === this.generation) {
        this.newsroom.state.connection = "error";
        this.newsroom.fail(
          new Error("Twitch WebSocket failed. Reconnect Twitch."),
        );
      }
    });
    socket.on("close", () => {
      if (generation === this.generation && this.socket === socket) {
        clearTimeout(this.watchdog);
        this.newsroom.state.connection = "disconnected";
        this.newsroom.emitState();
      }
    });
  }
  private async subscribe(sessionId: string) {
    const credentials = this.credentials!;
    for (const type of [
      "channel.chat.message",
      "channel.chat.message_delete",
      "channel.chat.clear",
      "channel.chat.clear_user_messages",
    ]) {
      await twitchRequest(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            "Client-Id": required("TWITCH_CLIENT_ID"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            version: "1",
            condition: {
              broadcaster_user_id: credentials.user.id,
              user_id: credentials.user.id,
            },
            transport: { method: "websocket", session_id: sessionId },
          }),
        },
      );
    }
  }
  disconnect() {
    this.generation++;
    clearTimeout(this.watchdog);
    clearTimeout(this.tokenExpiry);
    this.socket?.close();
    this.socket = undefined;
    this.newsroom.state.connection = "disconnected";
    this.newsroom.emitState();
  }
  async forget() {
    this.disconnect();
    this.credentials = undefined;
    await deleteRecord("TWITCH");
    this.newsroom.state.channel = null;
    await this.newsroom.reset("twitch");
  }
}
