import { AccountSessions } from "./sessions.ts";
import { authorizationUrl, exchangeCode, connectStream } from "./twitch.ts";
import { ensureRoom } from "./rooms.ts";
import { publishRoom } from "./realtime.ts";
import { HttpError, json } from "./http.ts";
import { origin } from "../config.ts";
export const sessions = new AccountSessions();
export async function authRoute(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/session" && request.method === "GET") {
    const session = await sessions.read(request.headers);
    return json({
      account: session?.account ?? null,
      canSignIn: Boolean(
        process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET,
      ),
    });
  }
  if (url.pathname === "/api/auth/logout" && request.method === "POST")
    return new Response(null, {
      status: 204,
      headers: {
        "Set-Cookie": await sessions.logout(request.headers),
        "Cache-Control": "no-store",
      },
    });
  if (url.pathname === "/api/twitch/connect" && request.method === "GET") {
    const state = sessions.beginOAuth();
    return new Response(null, {
      status: 303,
      headers: {
        Location: authorizationUrl(state.state),
        "Set-Cookie": state.cookie,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }
  if (url.pathname === "/api/twitch/callback" && request.method === "GET") {
    if (!sessions.verifyOAuth(request.headers, url.searchParams.get("state")))
      throw new HttpError(400, "Twitch login expired. Connect again.");
    const code = url.searchParams.get("code");
    if (!code || url.searchParams.has("error"))
      throw new HttpError(400, "Twitch authorization was declined.");
    const account = await exchangeCode(code);
    await ensureRoom(account);
    await connectStream(account);
    const result = await sessions.create(account);
    const headers = new Headers({
      Location: origin(),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    });
    headers.append("Set-Cookie", result.cookie);
    headers.append("Set-Cookie", sessions.clearOAuth());
    await publishRoom(account.id);
    return new Response(null, { status: 303, headers });
  }
  return null;
}
