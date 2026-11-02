import { broadcastRoute } from "./broadcast.ts";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { origin } from "../config.ts";
import { coverageModelOptions } from "../coverageSettings.ts";
import { simulatorSettingsSchema } from "../chatScript.ts";
import { overlayState } from "../ranking.ts";
import { authRoute, sessions } from "./authRoutes.ts";
import { HttpError, json, jsonBody } from "./http.ts";
import { appendMessage, changeRoom, getRoom, overlayOwner } from "./rooms.ts";
import {
  accountConnection,
  overlayConnection,
  publishRoom,
} from "./realtime.ts";
import { connectStream, disconnectStream, refreshStream } from "./twitch.ts";
import { receiveWebhook } from "./webhook.ts";
import { updateSettings, resetSource } from "./settings.ts";
import { startSimulation } from "./simulation.ts";
import { receiveAudio } from "./audio.ts";
import { analyzeRoom } from "./coverage.ts";
export type Defer = (work: Promise<unknown>) => void;
export function checkOrigin(request: Request) {
  if (
    !["GET", "HEAD"].includes(request.method) &&
    request.headers.get("origin") !== new URL(origin()).origin
  )
    throw new HttpError(403, "Request origin does not match.");
}
export async function handleRequest(
  request: Request,
  defer: Defer,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (Number(request.headers.get("content-length") ?? 0) > 4100000)
      throw new HttpError(413, "Request too large.");
    if (url.pathname === "/api/twitch/events" && request.method === "POST") {
      const result = await receiveWebhook(request);
      if (result.userId)
        defer(
          publishRoom(result.userId).then(() => analyzeRoom(result.userId!)),
        );
      return result.response;
    }
    checkOrigin(request);
    const auth = await authRoute(request);
    if (auth) return auth;
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      parts[0] === "api" &&
      parts[1] === "overlay" &&
      request.method === "GET" &&
      (parts.length === 3 || (parts.length === 4 && parts[3] === "realtime"))
    ) {
      const token = parts[2];
      const owner = await overlayOwner(token);
      if (!owner) throw new HttpError(404, "Overlay not found.");
      if (parts[3] === "realtime")
        return json(overlayConnection(owner.userId, token));
      const state = (await getRoom(owner.userId)).state;
      const overlay = overlayState(state);
      const deadlines = overlay.ticker.map(
        (story) => story.updatedAt + state.coverage.lifetimeSeconds * 1000,
      );
      return json({
        ...overlay,
        transport: "appsync",
        ...(deadlines.length ? { validUntil: Math.min(...deadlines) } : {}),
      });
    }
    const session = await sessions.read(request.headers);
    if (!session) throw new HttpError(401, "Sign in with Twitch.");
    const userId = session.account.id;
    const broadcast = await broadcastRoute(request, userId);
    if (broadcast) return broadcast;
    if (request.method === "GET") {
      if (url.pathname === "/api/realtime")
        return json(await accountConnection(session));
      if (url.pathname === "/api/bootstrap") {
        let room = await getRoom(userId);
        if (room.state.connection === "connecting")
          room = (await refreshStream(userId)) ?? room;
        return json({
          state: room.state,
          overlayUrl: `${origin()}/overlay/${room.overlayToken}`,
          twitchConfigured: true,
          coverageModels: coverageModelOptions(),
          transport: "appsync",
        });
      }
      throw new HttpError(404, "Not found.");
    }
    if (request.method !== "POST")
      throw new HttpError(405, "Method not allowed.");
    if (url.pathname === "/api/audio") {
      const result = await receiveAudio(userId, request);
      defer(publishRoom(userId).then(() => analyzeRoom(userId)));
      return json(result);
    }
    const body = await jsonBody(request);
    let result: unknown = { ok: true };
    if (url.pathname === "/api/settings") {
      const room = await updateSettings(userId, body);
      result = { ok: true, design: room.state.design, revision: room.revision, visible: room.state.visible };
    } else if (parts.length === 3 && parts[1] === "stories") {
      const { action } = z
        .object({ action: z.enum(["dismiss", "restore"]) })
        .strict()
        .parse(body);
      await changeRoom(userId, (room) => {
        const story = room.state.stories.find((item) => item.id === parts[2]);
        if (!story) throw new HttpError(404, "Story not found.");
        story.dismissed = action === "dismiss";
      });
    } else if (url.pathname === "/api/mode") {
      const { mode } = z
        .object({ mode: z.enum(["twitch", "simulation"]) })
        .strict()
        .parse(body);
      await changeRoom(userId, (room) => {
        if (room.state.mode !== mode) resetSource(room, mode);
      });
      if (mode === "twitch") await connectStream(session.account);
    } else if (url.pathname === "/api/twitch/reconnect") {
      await connectStream(session.account);
    } else if (url.pathname === "/api/twitch/disconnect") {
      await disconnectStream(userId);
    } else if (url.pathname === "/api/simulation/message") {
      const { author, text } = z
        .object({
          author: z.string().trim().min(1).max(30),
          text: z.string().trim().min(1).max(500),
        })
        .strict()
        .parse(body);
      const room = await getRoom(userId);
      if (room.state.mode !== "simulation")
        throw new HttpError(409, "Select Simulation first.");
      if (room.state.paused) throw new HttpError(409, "Resume coverage first.");
      if (
        !(await appendMessage(userId, room, {
          id: randomUUID(),
          userId: `sim-${author}`,
          author,
          text,
          at: Date.now(),
          source: "simulation",
        }))
      )
        throw new HttpError(409, "Source changed. Send again.");
    } else if (url.pathname === "/api/simulation/start") {
      const run = await startSimulation(
        userId,
        simulatorSettingsSchema.parse(body),
      );
      defer(run());
      return json({ ok: true }, 202);
    } else if (url.pathname === "/api/simulation/stop") {
      await changeRoom(userId, (room) => {
        room.simulationId = "";
        room.state.simulator = { status: "idle", delivered: 0, total: 0 };
      });
    } else throw new HttpError(404, "Not found.");
    await publishRoom(userId);
    defer(analyzeRoom(userId));
    return json(result);
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return json({ error: "Invalid request." }, 400);
    console.error(
      "Request failed",
      error instanceof Error
        ? { name: error.name, message: error.message }
        : "Unknown error",
    );
    return json({ error: "Request failed. Try again." }, 500);
  }
}
