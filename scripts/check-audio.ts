import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { transcribe } from "../server/transcription.ts";
import ffmpeg from "ffmpeg-static";
const directory = await mkdtemp(join(tmpdir(), "chyron-audio-check-"));
try {
  let path = process.argv[2];
  if (!path) {
    if (process.platform !== "darwin")
      throw new Error("Pass the path to a spoken audio fixture.");
    path = join(directory, "fixture.aiff");
    await promisify(execFile)("say", [
      "-v",
      "Samantha",
      "-o",
      path,
      "The keyboard was a gift from my grandmother. I did not buy it.",
    ]);
  }
  const result = await transcribe(await readFile(path));
  assert.ok(result.transcript.trim(), "Expected spoken words.");
  assert.equal(result.status, "speech", "Expected a confident transcription.");
  console.log("Bedrock audio transcription passed:", result.transcript);
  assert.ok(ffmpeg);
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
    const nonSpeech = await transcribe(await readFile(fixture));
    assert.notEqual(
      nonSpeech.status,
      "speech",
      `${name} must not become speech.`,
    );
    assert.equal(nonSpeech.transcript, "");
    console.log(`${name} correctly excluded from speech.`);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
