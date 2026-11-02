import test from "node:test";
import assert from "node:assert/strict";
import { hasAudibleSignal } from "../server/audioSignal.ts";
import { containsSpeech } from "../server/voiceActivity.ts";
function wave(samples: number[]) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24);
  buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) =>
    buffer.writeInt16LE(sample, 44 + index * 2),
  );
  return buffer;
}
test("silent recordings and constant offsets do not trigger transcription", () => {
  assert.equal(hasAudibleSignal(wave(Array(16000).fill(0))), false);
  assert.equal(hasAudibleSignal(wave(Array(16000).fill(50))), false);
});
test("the silence check preserves quiet audible input and rejects isolated clicks", () => {
  const quiet = Array.from({ length: 1600 }, (_, index) =>
    Math.round(90 * Math.sin((index * Math.PI) / 16)),
  );
  assert.equal(hasAudibleSignal(wave(quiet)), true);
  const click = Array(16000).fill(0);
  click[100] = 30000;
  assert.equal(hasAudibleSignal(wave(click)), false);
});
test("invalid decoder output fails explicitly", () => {
  assert.throws(() => hasAudibleSignal(Buffer.from("not audio")), {
    message: "Invalid decoded audio.",
  });
  const truncated = wave([1, 2, 3]).subarray(0, 46);
  assert.throws(() => hasAudibleSignal(truncated), {
    message: "Invalid decoded audio.",
  });
  const stereo = wave(Array(1600).fill(0));
  stereo.writeUInt16LE(2, 22);
  assert.throws(() => hasAudibleSignal(stereo), {
    message: "Invalid decoded audio.",
  });
});

test("the voice detector rejects audible non-speech before transcription", async () => {
  const tone = Array.from({ length: 32000 }, (_, index) =>
    Math.round(4000 * Math.sin((2 * Math.PI * 440 * index) / 16000)),
  );
  assert.equal(hasAudibleSignal(wave(tone)), true);
  assert.equal(await containsSpeech(wave(tone)), false);
  assert.equal(await containsSpeech(wave(Array(32000).fill(0))), false);
});
