export function decodedAudio(wav: Buffer) {
  if (
    wav.length < 12 ||
    wav.toString("ascii", 0, 4) !== "RIFF" ||
    wav.toString("ascii", 8, 12) !== "WAVE"
  )
    throw new Error("Invalid decoded audio.");
  let pcm: Buffer | undefined;
  let formatValid = false;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const name = wav.toString("ascii", offset, offset + 4);
    const length = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + length > wav.length) throw new Error("Invalid decoded audio.");
    if (name === "fmt ") {
      formatValid =
        length >= 16 &&
        wav.readUInt16LE(start) === 1 &&
        wav.readUInt16LE(start + 2) === 1 &&
        wav.readUInt32LE(start + 4) === 16000 &&
        wav.readUInt16LE(start + 14) === 16;
    }
    if (name === "data") pcm = wav.subarray(start, start + length);
    offset = start + length + (length % 2);
  }
  if (!formatValid || !pcm || pcm.length % 2)
    throw new Error("Invalid decoded audio.");
  return pcm;
}
export function hasAudibleSignal(wav: Buffer) {
  const pcm = decodedAudio(wav);
  const frameSamples = 320;
  let audibleFrames = 0;
  for (
    let offset = 0;
    offset + frameSamples * 2 <= pcm.length;
    offset += frameSamples * 2
  ) {
    let total = 0,
      squares = 0;
    for (let index = 0; index < frameSamples; index++) {
      const value = pcm.readInt16LE(offset + index * 2) / 32768;
      total += value;
      squares += value * value;
    }
    const variance = Math.max(
      0,
      squares / frameSamples - (total / frameSamples) ** 2,
    );
    if (Math.sqrt(variance) >= 0.001 && ++audibleFrames >= 3) return true;
  }
  return false;
}
