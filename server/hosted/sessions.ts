import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import cookie from "@fastify/cookie";
import { parseCookie, stringifySetCookie } from "cookie";
import { z } from "zod";
import type { StreamerAccount } from "../../shared/session.ts";
import { required } from "../config.ts";
import { records, type RecordStore } from "./records.ts";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const sessionCookie = "chyron_session";
const oauthCookie = "chyron_oauth";
const sessionSeconds = 30 * 24 * 60 * 60;
export interface AccountSession {
  account: StreamerAccount;
  expiresAt: number;
  id: string;
}
const sessionKey = (token: string) => ({
  pk: `SESSION#${tokenHash(token)}`,
  sk: "TOKEN",
});
const userSessionKey = (userId: string, id: string) => ({
  pk: `USER#${userId}`,
  sk: `SESSION#${id}`,
});
function serialize(name: string, value: string, maxAge: number) {
  return stringifySetCookie({
    name,
    value,
    httpOnly: true,
    secure: new URL(required("APP_ORIGIN")).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}
export function equalTokens(left: string, right: string) {
  const a = Buffer.from(left),
    b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export class AccountSessions {
  constructor(
    private store: RecordStore = records,
    private now = Date.now,
  ) {}
  async create(account: StreamerAccount) {
    const token = randomBytes(32).toString("hex");
    const id = tokenHash(token);
    const expiresAt = Math.floor(this.now() / 1000) + sessionSeconds;
    const session: AccountSession = { account, expiresAt, id };
    await this.store.put(
      userSessionKey(account.id, id),
      { id, expiresAt },
      { expiresAt },
    );
    try {
      await this.store.put(sessionKey(token), session, { expiresAt });
    } catch (error) {
      await this.store.remove(userSessionKey(account.id, id));
      throw error;
    }
    return { session, cookie: serialize(sessionCookie, token, sessionSeconds) };
  }
  async read(headers: Headers) {
    const token = parseCookie(headers.get("cookie") ?? "")[sessionCookie];
    if (!token || token.length !== 64) return null;
    const session = await this.store.get<AccountSession>(sessionKey(token));
    if (
      !session ||
      session.expiresAt <= this.now() / 1000 ||
      session.id !== tokenHash(token)
    )
      return null;
    return session;
  }
  async logout(headers: Headers) {
    const token = parseCookie(headers.get("cookie") ?? "")[sessionCookie];
    if (token) {
      const session = await this.read(headers);
      if (session)
        await this.store.remove(userSessionKey(session.account.id, session.id));
      await this.store.remove(sessionKey(token));
    }
    return serialize(sessionCookie, "", 0);
  }
  beginOAuth() {
    const state = randomBytes(32).toString("hex");
    const value = cookie.sign(
      JSON.stringify({ state, expiresAt: this.now() + 10 * 60000 }),
      required("COOKIE_SECRET"),
    );
    return { state, cookie: serialize(oauthCookie, value, 600) };
  }
  verifyOAuth(headers: Headers, state: string | null) {
    const value = parseCookie(headers.get("cookie") ?? "")[oauthCookie];
    if (!value || !state) return false;
    const signed = cookie.unsign(value, required("COOKIE_SECRET"));
    if (!signed.valid || !signed.value) return false;
    try {
      const stored = z
        .object({ state: z.string(), expiresAt: z.number() })
        .parse(JSON.parse(signed.value));
      return stored.expiresAt > this.now() && equalTokens(stored.state, state);
    } catch {
      return false;
    }
  }
  clearOAuth() {
    return serialize(oauthCookie, "", 0);
  }
}
