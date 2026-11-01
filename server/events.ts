import type { FastifyReply } from "fastify";
import type { Newsroom } from "./newsroom.ts";
export function streamState(
  reply: FastifyReply,
  newsroom: Newsroom,
  snapshot: () => unknown,
) {
  reply.hijack();
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    "Referrer-Policy": "no-referrer",
  });
  let closed = false;
  const send = () => {
    if (closed) return;
    if (reply.raw.writableLength > 512000) {
      reply.raw.destroy();
      return;
    }
    reply.raw.write(`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`);
  };
  newsroom.on("state", send);
  send();
  reply.raw.on("close", () => {
    closed = true;
    newsroom.off("state", send);
  });
}
