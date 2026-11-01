import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createApp } from "./app.ts";
import { Newsroom } from "./newsroom.ts";
const room = new Newsroom();
await room.restore();
const { app, twitch } = await createApp(room);
await twitch.loadConfiguration();
if (process.env.NODE_ENV === "production") {
  const { default: serveStatic } = await import("@fastify/static");
  await app.register(serveStatic, { root: resolve("dist") });
  app.setNotFoundHandler((request, reply) =>
    request.url.startsWith("/api/")
      ? reply.code(404).send({ error: "Route not found." })
      : reply.sendFile("index.html"),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: { server: app.server } },
    appType: "custom",
  });
  app.addHook("onRequest", async (request, reply) => {
    if (request.url.startsWith("/api/")) return;
    await new Promise<void>((done, reject) => {
      const finish = () => {
        reply.raw.off("finish", finish);
        done();
      };
      reply.raw.once("finish", finish);
      vite.middlewares(request.raw, reply.raw, (error?: unknown) => {
        reply.raw.off("finish", finish);
        error ? reject(error) : done();
      });
    });
    if (reply.raw.writableEnded) reply.hijack();
  });
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/"))
      return reply.code(404).send({ error: "Route not found." });
    const html = await vite.transformIndexHtml(
      request.url,
      await readFile(resolve("index.html"), "utf8"),
    );
    return reply.type("text/html").send(html);
  });
  app.addHook("onClose", async () => vite.close());
}
await app.listen({ port: Number(process.env.PORT ?? 5173), host: "127.0.0.1" });
console.log(`Chyron: ${process.env.APP_ORIGIN}`);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
