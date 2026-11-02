import { ChatSimulator } from "./chatSimulator.ts";
import { simulatorSettingsSchema } from "./chatScript.ts";
import {
  coverageSettingsSchema,
  coverageModelOptions,
  configuredCoverageModel,
} from "./coverageSettings.ts";
import { overlayColors, overlayStyleIds } from "../shared/overlayDesign.ts";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Newsroom } from "./newsroom.ts";
import type { TwitchConnection } from "./twitch.ts";
import { origin } from "./config.ts";
import { overlayState } from "./ranking.ts";
import { streamState } from "./events.ts";
import { transcribe } from "./transcription.ts";
function equal(left: string, right: string) {
  const a = Buffer.from(left),
    b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function registerRoutes(
  app: FastifyInstance,
  room: Newsroom,
  twitch: TwitchConnection,
) {
  const simulator = new ChatSimulator(room);
  app.get("/api/session", async (request) => ({ account: request.cookies.chyron_local_logged_out ? null : room.state.channel, local: !request.cookies.chyron_local_logged_out, canSignIn: twitch.configured() }));
  app.post("/api/auth/logout", async (_request, reply) => { reply.setCookie("chyron_local_logged_out", "1", { path: "/", httpOnly: true, sameSite: "lax" }); return { ok: true }; });
  app.post("/api/simulation/start", async (request, reply) => {
    const settings = simulatorSettingsSchema.parse(request.body);
    if (room.state.mode !== "simulation")
      throw new Error("Select Simulation first.");
    configuredCoverageModel(settings.model);
    if (room.state.paused) throw new Error("Resume coverage first.");
    if (room.state.simulator.status !== "idle")
      throw new Error("Stop the current simulation first.");
    void simulator.start(settings).catch((error) => room.fail(error));
    return reply.code(202).send({ ok: true });
  });
  app.post("/api/simulation/stop", async () => {
    simulator.stop();
    return { ok: true };
  });
  app.get("/api/bootstrap", async () => ({
    state: room.state,
    overlayUrl: `${origin()}/overlay/${room.overlayToken}`,
    twitchConfigured: twitch.configured(),
    coverageModels: coverageModelOptions(),
  }));
  app.get("/api/events", async (_request, reply) =>
    streamState(reply, room, () => room.state),
  );
  app.get<{ Params: { token: string } }>(
    "/api/overlay/:token",
    async (request, reply) => {
      if (!equal(request.params.token, room.overlayToken))
        return reply.code(404).send({ error: "Overlay not found." });
      return overlayState(room.state);
    },
  );
  app.get<{ Params: { token: string } }>(
    "/api/overlay/:token/events",
    async (request, reply) => {
      if (!equal(request.params.token, room.overlayToken))
        return reply.code(404).send({ error: "Overlay not found." });
      streamState(reply, room, () => overlayState(room.state));
    },
  );
  app.post("/api/settings", async (request) => {
    const patch = z
      .object({
        coverage: coverageSettingsSchema.partial().strict().optional(),
        paused: z.boolean().optional(),
        visible: z.boolean().optional(),
        design: z
          .object({
            style: z.enum(overlayStyleIds).optional(),
            color: z.enum(overlayColors).optional(),
            size: z.number().int().min(70).max(130).optional(),
            speed: z.number().int().min(10).max(70).optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .parse(request.body);
    const { design, coverage, ...settings } = patch;
    if (coverage && room.state.working)
      throw new Error(
        "Wait for coverage to finish before changing news settings.",
      );
    if (coverage?.model) configuredCoverageModel(coverage.model);
    Object.assign(room.state, settings);
    if (coverage) {
      room.state.coverage = { ...room.state.coverage, ...coverage };
      room.state.model = configuredCoverageModel(room.state.coverage.model);
    }
    if (design) room.state.design = { ...room.state.design, ...design };
    if (patch.paused) room.state.sourceId = randomUUID();
    const appliedDesign = { ...room.state.design };
    const appliedRevision = room.state.revision + 1;
    await room.commit();
    if (coverage?.lifetimeSeconds) room.scheduleExpiry();
    if (coverage) room.rescheduleCoverage();
    if (patch.paused) simulator.stop();
    if (patch.paused === false) room.scheduleCoverage();
    return { ok: true, design: appliedDesign, revision: appliedRevision };
  });
  app.post<{ Params: { id: string } }>("/api/stories/:id", async (request) => {
    const { action } = z
      .object({ action: z.enum(["dismiss", "restore"]) })
      .strict()
      .parse(request.body);
    const story = room.state.stories.find(
      (item) => item.id === request.params.id,
    );
    if (!story) throw new Error("Story not found.");
    story.dismissed = action === "dismiss";
    await room.commit();
    room.scheduleExpiry();
    return { ok: true };
  });
  app.post("/api/mode", async (request) => {
    const { mode } = z
      .object({ mode: z.enum(["twitch", "simulation"]) })
      .parse(request.body);
    if (room.state.working)
      throw new Error("Wait for coverage to finish before changing source.");
    twitch.disconnect();
    await room.reset(mode);
    return { ok: true };
  });
  app.post("/api/simulation/message", async (request) => {
    if (room.state.mode !== "simulation")
      throw new Error("Select Simulation first.");
    const { author, text } = z
      .object({
        author: z.string().trim().min(1).max(30),
        text: z.string().trim().min(1).max(500),
      })
      .parse(request.body);
    room.add([
      {
        id: randomUUID(),
        userId: `sim-${author}`,
        author,
        text,
        at: Date.now(),
        source: "simulation",
      },
    ]);
    return { ok: true };
  });
  app.post("/api/twitch/configure", async (request) => {
    const { clientId, clientSecret } = z
      .object({
        clientId: z.string().trim().min(1).max(200),
        clientSecret: z.string().trim().min(1).max(200),
      })
      .strict()
      .parse(request.body);
    await twitch.configure(clientId, clientSecret);
    return { ok: true };
  });
  app.get("/api/twitch/connect", async (_request, reply) => {
    if (!twitch.configured())
      throw new Error("Configure Twitch application credentials.");
    const state = randomBytes(32).toString("hex");
    reply.setCookie("twitch_state", state, {
      httpOnly: true,
      sameSite: "lax",
      signed: true,
      path: "/api/twitch",
      maxAge: 600,
      secure: origin().startsWith("https:"),
    });
    return reply.redirect(twitch.authorizationUrl(state));
  });
  app.get("/api/twitch/callback", async (request, reply) => {
    const query = z
      .object({
        code: z.string().optional(),
        state: z.string().optional(),
        error: z.string().optional(),
      })
      .parse(request.query);
    const cookie = app.unsignCookie(request.cookies.twitch_state ?? "");
    reply.clearCookie("twitch_state", { path: "/api/twitch" });
    if (
      !cookie.valid ||
      !cookie.value ||
      !query.state ||
      !equal(cookie.value, query.state)
    )
      throw new Error("Twitch login expired. Connect Twitch again.");
    if (query.error || !query.code)
      throw new Error("Twitch authorization was declined.");
    await twitch.authorize(query.code);
    reply.clearCookie("chyron_local_logged_out", { path: "/" });
    return reply.redirect("/");
  });
  app.post("/api/twitch/reconnect", async () => {
    await twitch.connect();
    return { ok: true };
  });
  app.post("/api/twitch/disconnect", async () => {
    await twitch.forget();
    return { ok: true };
  });
  app.addContentTypeParser(
    ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg"],
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body),
  );
  let transcribing = false;
  app.post("/api/audio", async (request, reply) => {
    if (transcribing)
      return reply
        .code(409)
        .send({ error: "Audio transcription is already running." });
    if (!(request.body instanceof Buffer))
      throw new Error("Send an audio recording.");
    if (room.state.paused)
      throw new Error("Resume coverage before adding audio.");
    const sourceId = request.headers["x-chyron-source"];
    if (sourceId !== room.state.sourceId)
      throw new Error("Audio source changed. Start capture again.");
    transcribing = true;
    const mode = room.state.mode,
      channel = room.state.channel?.id;
    try {
      const result = await transcribe(request.body);
      if (
        sourceId !== room.state.sourceId ||
        room.state.paused ||
        room.state.mode !== mode ||
        room.state.channel?.id !== channel
      )
        throw new Error("Source changed during transcription. Record again.");
      if (!result.transcript.trim())
        return { transcript: "", status: "silence" };
      if (result.uncertainties.length)
        return { transcript: "", status: "uncertain" };
      room.add([
        {
          id: randomUUID(),
          userId: "streamer-audio",
          author: room.state.channel?.name ?? "Streamer",
          text: result.transcript,
          at: Date.now(),
          source: "audio",
        },
      ]);
      return { transcript: result.transcript, status: "speech" };
    } finally {
      transcribing = false;
    }
  });
}
