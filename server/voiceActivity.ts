import { createRequire as createModelRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { InferenceSession, Tensor } from "onnxruntime-node";
import { decodedAudio, hasAudibleSignal } from "./audioSignal.ts";
let session: Promise<InferenceSession> | undefined;
function detector() {
  session ??= readFile(
    process.env.VERCEL
      ? new URL("./silero_vad.onnx", import.meta.url)
      : createModelRequire(import.meta.url).resolve(
          "@ricky0123/vad-node/dist/silero_vad.onnx",
        ),
  )
    .then((model) =>
      InferenceSession.create(model, {
        intraOpNumThreads: 1,
        interOpNumThreads: 1,
        executionProviders: ["cpu"],
      }),
    )
    .catch((error) => {
      session = undefined;
      throw error;
    });
  return session;
}
export async function containsSpeech(wav: Buffer) {
  if (!hasAudibleSignal(wav)) return false;
  const pcm = decodedAudio(wav);
  const model = await detector();
  let h: Tensor = new Tensor("float32", new Float32Array(128), [2, 1, 64]);
  let c: Tensor = new Tensor("float32", new Float32Array(128), [2, 1, 64]);
  const sr = new Tensor("int64", BigInt64Array.from([16000n]), []);
  let speechFrames = 0;
  for (let start = 0; start < pcm.length; start += 1536 * 2) {
    const frame = new Float32Array(1536);
    for (
      let index = 0;
      index < frame.length && start + index * 2 + 1 < pcm.length;
      index++
    )
      frame[index] = pcm.readInt16LE(start + index * 2) / 32768;
    const result = await model.run({
      input: new Tensor("float32", frame, [1, frame.length]),
      h,
      c,
      sr,
    });
    const probability = result.output?.data[0];
    if (typeof probability !== "number" || !result.hn || !result.cn)
      throw new Error("Voice detection failed. Try capture again.");
    h = result.hn;
    c = result.cn;
    if (probability >= 0.5 && ++speechFrames >= 2) return true;
  }
  return false;
}
