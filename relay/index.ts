import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import { required } from "../server/config.ts";
import { consumeTicket } from "./tickets.ts";
import { createEncoder, type Encoder } from "./encoder.ts";
const origin = required("APP_ORIGIN");
const originSecret = required("BROADCAST_ORIGIN_SECRET");
const active = new Map<string, WebSocket>();
function trusted(header: string | string[] | undefined) {
  if (typeof header !== "string") return false;
  const actual = Buffer.from(header),
    expected = Buffer.from(originSecret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const server = createServer((request, response) => {
  if (
    request.url === "/health" &&
    trusted(request.headers["x-chyron-origin"])
  ) {
    response.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify({ ready: true }));
  } else {
    response.writeHead(404);
    response.end();
  }
});
const websocket = new WebSocketServer({
  noServer: true,
  maxPayload: 2000000,
  perMessageDeflate: false,
});
server.on("upgrade", (request, socket, head) => {
  socket.on("error", () => {});
  if (
    request.url !== "/broadcast" ||
    request.headers.origin !== origin ||
    !trusted(request.headers["x-chyron-origin"])
  ) {
    socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    return;
  }
  const protocols =
    request.headers["sec-websocket-protocol"]
      ?.split(",")
      .map((value) => value.trim()) ?? [];
  const protocol = protocols.find((value) => value.startsWith("chyron."));
  if (!protocol) {
    socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    return;
  }
  void consumeTicket(protocol.slice(7))
    .then((ticket) => {
      if (socket.destroyed) return;
      if (
        active.has(ticket.userId) ||
        active.size >= Number(process.env.MAX_BROADCASTS ?? 2)
      ) {
        socket.end("HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n");
        return;
      }
      websocket.handleUpgrade(request, socket, head, (ws) => {
        active.set(ticket.userId, ws);
        let encoder: Encoder | undefined,
          stopping = false;
        let shutdown: ReturnType<typeof setTimeout> | undefined;
        const send = (message: unknown) => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify(message));
        };
        const stop = () => {
          if (stopping) return;
          stopping = true;
          encoder?.end();
          shutdown = setTimeout(() => {
            encoder?.kill();
            ws.close();
          }, 5000);
        };
        ws.on("close", stop);
        ws.on("error", stop);
        ws.on("message", (data, binary) => {
          if (stopping) return;
          if (!encoder) {
            ws.close(1008, "Encoder unavailable");
            return;
          }
          if (!binary) {
            try {
              if (JSON.parse(data.toString()).type === "stop") {
                stop();
                return;
              }
            } catch {
              /* Invalid control messages close the stream below. */
            }
            ws.close(1008, "Invalid control message");
            return;
          }
          const buffer = Buffer.isBuffer(data)
            ? data
            : Buffer.from(data as ArrayBuffer);
          if (!encoder.write(buffer)) {
            ws.pause();
            encoder.onDrain(() => ws.resume());
          }
        });
        void createEncoder(
          ticket.streamKey,
          ticket.test,
          () => send({ type: "live" }),
          (ok) => {
            clearTimeout(shutdown);
            active.delete(ticket.userId);
            send(
              stopping
                ? { type: "ended" }
                : {
                    type: "error",
                    message:
                      "Twitch broadcast stopped. Check your connection and start again.",
                  },
            );
            ws.close();
          },
        )
          .then((value) => {
            encoder = value;
            if (stopping || ws.readyState !== WebSocket.OPEN) {
              value.end();
              return;
            }
            send({ type: "ready" });
          })
          .catch(() => {
            send({ type: "error", message: "Broadcast encoder unavailable." });
            active.delete(ticket.userId);
            ws.close();
          });
      });
    })
    .catch(() =>
      socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n"),
    );
});
server.listen(Number(process.env.PORT ?? 8080), "0.0.0.0");
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    for (const ws of active.values()) ws.close(1001, "Relay restarting");
    server.close();
  });
