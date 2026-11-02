import test from "node:test";
import assert from "node:assert/strict";
import { AccountSessions } from "../server/hosted/sessions.ts";
import type { RecordKey, RecordStore } from "../server/hosted/records.ts";
const account = {
  id: "100",
  name: "Streamer",
  login: "streamer",
  avatarUrl: "https://static-cdn.jtvnw.net/avatar.png",
};
function fixture() {
  const rows = new Map<string, unknown>();
  const key = (value: RecordKey) => JSON.stringify(value);
  const store: RecordStore = {
    async get<T>(id: RecordKey) {
      return structuredClone(rows.get(key(id))) as T | undefined;
    },
    async put(id, value) {
      rows.set(key(id), structuredClone(value));
    },
    async remove(id) {
      rows.delete(key(id));
    },
  };
  let now = Date.now();
  return {
    rows,
    sessions: new AccountSessions(store, () => now),
    advance: (ms: number) => {
      now += ms;
    },
  };
}
process.env.APP_ORIGIN = "https://chyron.example";
process.env.COOKIE_SECRET = "session-test-secret-with-at-least-32-characters";
test("account cookies are secure and do not expose Twitch or AWS credentials", async () => {
  const f = fixture();
  const one = await f.sessions.create(account);
  const two = await f.sessions.create({ ...account, id: "200", name: "Other" });
  assert.ok(one.cookie.includes("HttpOnly"));
  assert.ok(one.cookie.includes("Secure"));
  assert.ok(one.cookie.includes("SameSite=Lax"));
  assert.notEqual(one.cookie, two.cookie);
  const read = await f.sessions.read(
    new Headers({ cookie: one.cookie.split(";")[0] }),
  );
  assert.equal(read?.account.id, "100");
  assert.equal("accessToken" in read!, false);
  assert.equal(
    await f.sessions.read(
      new Headers({ cookie: `chyron_session=${"a".repeat(64)}` }),
    ),
    null,
  );
});
test("logout revokes only the current browser session and its realtime channel", async () => {
  const f = fixture();
  const one = await f.sessions.create(account);
  const two = await f.sessions.create(account);
  const headers = new Headers({ cookie: one.cookie.split(";")[0] });
  const expired = await f.sessions.logout(headers);
  assert.ok(expired.includes("Max-Age=0"));
  assert.equal(await f.sessions.read(headers), null);
  assert.ok(
    await f.sessions.read(new Headers({ cookie: two.cookie.split(";")[0] })),
  );
  assert.equal(f.rows.size, 2);
});
test("session expiry is enforced before eventual database TTL cleanup", async () => {
  const f = fixture();
  const value = await f.sessions.create(account);
  f.advance(31 * 86400000);
  assert.equal(
    await f.sessions.read(new Headers({ cookie: value.cookie.split(";")[0] })),
    null,
  );
});
test("OAuth state requires the signed browser cookie, correct nonce and unexpired timestamp", () => {
  const f = fixture();
  const value = f.sessions.beginOAuth();
  const headers = new Headers({ cookie: value.cookie.split(";")[0] });
  assert.equal(f.sessions.verifyOAuth(headers, value.state), true);
  assert.equal(f.sessions.verifyOAuth(new Headers(), value.state), false);
  assert.equal(f.sessions.verifyOAuth(headers, "counterfeit"), false);
  f.advance(600001);
  assert.equal(f.sessions.verifyOAuth(headers, value.state), false);
});
