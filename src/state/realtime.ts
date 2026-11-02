import type { RealtimeConnection } from "../../shared/session.ts";
import { api } from "./api.ts";
export function connectRealtime(
  path: string,
  refresh: () => Promise<void>,
  ready: () => void,
  fail: (message: string) => void,
) {
  let active = true;
  let socket: WebSocket | undefined;
  let heartbeat: ReturnType<typeof setTimeout> | undefined;
  let timeoutMs = 0;
  const armHeartbeat = () => {
    clearTimeout(heartbeat);
    if (timeoutMs)
      heartbeat = setTimeout(() => {
        if (active) {
          fail("Live connection timed out. Reconnect.");
          socket?.close();
        }
      }, timeoutMs);
  };
  let refreshing = false;
  let dirty = false;
  const update = async () => {
    dirty = true;
    if (refreshing) return;
    refreshing = true;
    try {
      while (active && dirty) {
        dirty = false;
        await refresh();
      }
    } catch (error) {
      if (active)
        fail(error instanceof Error ? error.message : "Live update failed.");
    } finally {
      refreshing = false;
    }
  };
  void api<RealtimeConnection>(path)
    .then((connection) => {
      if (!active) return;
      const authorization = {
        host: connection.host,
        Authorization: connection.token,
      };
      const header = btoa(JSON.stringify(authorization))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
      socket = new WebSocket(connection.url, [
        "aws-appsync-event-ws",
        `header-${header}`,
      ]);
      const id = crypto.randomUUID();
      socket.onopen = () =>
        socket?.send(JSON.stringify({ type: "connection_init" }));
      socket.onmessage = (event) => {
        if (!active) return;
        try {
          const message = JSON.parse(event.data) as {
            type: string;
            event?: string | string[];
            connectionTimeoutMs?: number;
          };
          if (message.type === "connection_ack") {
            timeoutMs = message.connectionTimeoutMs ?? 0;
            armHeartbeat();
            socket?.send(
              JSON.stringify({
                type: "subscribe",
                id,
                channel: connection.channel,
                authorization,
              }),
            );
          } else if (message.type === "ka") armHeartbeat();
          else if (message.type === "subscribe_success") {
            ready();
            void update();
          } else if (message.type === "data") void update();
          else if (
            [
              "error",
              "connection_error",
              "subscribe_error",
              "broadcast_error",
            ].includes(message.type)
          ) {
            fail("Live connection failed. Reconnect.");
            socket?.close();
          }
        } catch {
          fail("Invalid live update. Reconnect.");
          socket?.close();
        }
      };
      socket.onerror = () => {
        if (active) fail("Live connection failed. Reconnect.");
      };
      socket.onclose = () => {
        if (active) fail("Live connection closed. Reconnect.");
      };
    })
    .catch((error) => {
      if (active) fail(error.message);
    });
  return () => {
    active = false;
    clearTimeout(heartbeat);
    socket?.close();
  };
}
