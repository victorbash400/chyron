import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpeg from "ffmpeg-static";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { AccountSessions, tokenHash } from "../server/hosted/sessions.ts";
import { ensureRoom, getRoom } from "../server/hosted/rooms.ts";
import { getDatabase, records, tableName } from "../server/hosted/records.ts";
const account = { id: `qa-audio-${randomUUID()}`, name: "Audio verification" };
const origin = process.env.APP_ORIGIN!;
assert.ok(origin?.startsWith("https://"));
const sessions = new AccountSessions();
const directory = await mkdtemp(join(tmpdir(), "chyron-hosted-audio-"));
let headers: Headers | undefined;
let overlayToken: string | undefined;
try {
  assert.ok(ffmpeg);
  const room = await ensureRoom(account);
  overlayToken = room.overlayToken;
  const created = await sessions.create(account);
  headers = new Headers({ Cookie: created.cookie.split(";")[0]! });
  for (const [name, source] of [
    ["silence", "anullsrc=r=16000:cl=mono"],
    ["tone", "sine=frequency=440:sample_rate=16000"],
  ] as const) {
    const fixture = join(directory, `${name}.wav`);
    await promisify(execFile)(ffmpeg, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      source,
      "-t",
      "2",
      fixture,
    ]);
    const response: Response = await fetch(new URL("/api/audio", process.env.CHECK_DEPLOYMENT_URL ?? origin), {
      method: "POST",
      headers: {
        Cookie: headers.get("cookie")!,
        Origin: origin,
        "Content-Type": "audio/wav",
        "X-Chyron-Source": room.state.sourceId,
      },
      body: new Uint8Array(await readFile(fixture)),
      signal: AbortSignal.timeout(60000),
    });
    const result: Record<string, unknown> = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.notEqual(result.status, "speech");
    assert.equal(result.transcript, "");
  }
  assert.deepEqual((await getRoom(account.id)).state.messages, []);
  console.log(
    "Hosted audio passed: silence and tone rejected; no chat or transcript records created.",
  );
} finally {
  if (headers) await sessions.logout(headers);
  if (overlayToken)
    await records.remove({
      pk: `OVERLAY#${tokenHash(overlayToken)}`,
      sk: "TOKEN",
    });
  const rows = await getDatabase().send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": `USER#${account.id}` },
      ProjectionExpression: "pk, sk",
      ConsistentRead: true,
    }),
  );
  for (const row of rows.Items ?? [])
    await records.remove({ pk: row.pk, sk: row.sk });
  await rm(directory, { recursive: true, force: true });
}
