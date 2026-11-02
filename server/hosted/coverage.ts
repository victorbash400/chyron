import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Newsroom } from "../newsroom.ts";
import { writeCoverage } from "../editor.ts";
import {
  acquireCoverage,
  releaseCoverage,
  getRoom,
  changeRoom,
} from "./rooms.ts";
import { publishRoom } from "./realtime.ts";
export async function analyzeRoom(userId: string) {
  const pending = await getRoom(userId);
  const audioPending =
    pending.state.coverage.includeAudio &&
    pending.state.messages.some(
      (message) =>
        message.source === "audio" && message.at > pending.lastAnalysisAt,
    );
  if (
    pending.state.paused ||
    pending.received <= pending.processed ||
    (!audioPending &&
      pending.received - pending.processed <
        pending.state.coverage.minimumMessages)
  )
    return;
  const owner = randomUUID();
  if (!(await acquireCoverage(userId, owner))) return;
  const started = Date.now();
  try {
    await publishRoom(userId);
    while (Date.now() - started < 200000) {
      const before = await getRoom(userId);
      if (before.leaseOwner !== owner || before.state.paused) break;
      await delay(before.state.coverage.updateDelayMs);
      const room = await getRoom(userId);
      const unread = room.received - room.processed;
      const audio =
        room.state.coverage.includeAudio &&
        room.state.messages.some(
          (message) =>
            message.source === "audio" && message.at > room.lastAnalysisAt,
        );
      if (!unread || (!audio && unread < room.state.coverage.minimumMessages)) {
        if (await releaseCoverage(userId, owner, room.received)) return;
        continue;
      }
      const cutoff = Date.now();
      const settings = room.state.coverage;
      const messages = room.state.messages.filter(
        (message) =>
          cutoff - message.at < settings.contextSeconds * 1000 &&
          (settings.includeAudio || message.source !== "audio"),
      );
      if (!messages.length) {
        await changeRoom(userId, (current) => {
          current.processed = room.received;
          current.lastAnalysisAt = cutoff;
        });
        continue;
      }
      const existing = room.state.stories.filter(
        (story) => cutoff - story.updatedAt < settings.lifetimeSeconds * 1000,
      );
      const output = await writeCoverage(messages, existing, settings);
      await changeRoom(userId, (current) => {
        if (
          current.state.sourceId !== room.state.sourceId ||
          current.state.paused ||
          current.leaseOwner !== owner
        )
          return;
        const engine = new Newsroom(
          async () => ({ stories: [] }),
          async () => {},
        );
        try {
          engine.state = current.state;
          engine.apply(output, Date.now());
          current.state = engine.state;
          current.state.error = null;
          current.processed = room.received;
          current.lastAnalysisAt = cutoff;
          current.leaseUntil = Date.now() + 120000;
        } finally {
          engine.dispose();
        }
      });
      await publishRoom(userId);
    }
  } catch (error) {
    await changeRoom(userId, (room) => {
      room.state.error =
        error instanceof Error
          ? error.message
          : "Coverage failed. Check Chyron settings.";
    });
  } finally {
    await releaseCoverage(userId, owner);
    await publishRoom(userId);
  }
}
