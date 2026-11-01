import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { required, origin } from "./config.ts";
import { Newsroom } from "./newsroom.ts";
import { TwitchConnection } from "./twitch.ts";
import { registerRoutes } from "./routes.ts";
export async function createApp(room = new Newsroom()) {
  const app = Fastify({ logger: false, bodyLimit: 4000000 });
  await app.register(cookie, { secret: required("COOKIE_SECRET") });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  const allowedOrigin = origin();
  const allowedHosts = new Set([
    new URL(allowedOrigin).host,
    `127.0.0.1:${process.env.PORT ?? 5173}`,
  ]);
  if (!["localhost", "127.0.0.1"].includes(new URL(allowedOrigin).hostname))
    throw new Error("This development build requires a localhost APP_ORIGIN.");
  app.addHook("onRequest", async (request, reply) => {
    if (!allowedHosts.has(request.headers.host ?? ""))
      return reply.code(403).send({ error: "Invalid host." });
    const source = request.headers.origin;
    if (
      (source && source !== allowedOrigin) ||
      (request.url.startsWith("/api/") &&
        request.headers["sec-fetch-site"] === "cross-site" &&
        request.url !== "/api/twitch/callback" &&
        !request.url.startsWith("/api/twitch/callback?"))
    )
      return reply.code(403).send({ error: "Open Chyron directly." });
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Content-Type-Options", "nosniff");
    if (request.url.startsWith("/api/"))
      reply.header("Cache-Control", "no-store");
  });
  app.setErrorHandler((error, _request, reply) => {
    const message =
      error instanceof z.ZodError
        ? "Check the submitted values."
        : error instanceof Error
          ? error.message
          : "Request failed.";
    const status =
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 400;
    reply.code(status >= 400 ? status : 400).send({ error: message });
  });
  const twitch = new TwitchConnection(room);
  await registerRoutes(app, room, twitch);
  app.addHook("preClose", async () => {
    room.emit("shutdown");
  });
  app.addHook("onClose", async () => {
    twitch.disconnect();
    room.dispose();
  });
  return { app, room, twitch };
}
