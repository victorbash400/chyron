import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { copyFile } from "node:fs/promises";
import ffmpeg from "ffmpeg-static";
if (!ffmpeg) throw new Error("Audio decoder unavailable.");
await copyFile(ffmpeg, "server/hosted/ffmpeg");
await copyFile(
  createRequire(import.meta.url).resolve(
    "@ricky0123/vad-node/dist/silero_vad.onnx",
  ),
  "server/hosted/silero_vad.onnx",
);
await build({
  entryPoints: ["server/hosted/entry.ts"],
  outfile: "server/hosted/bundle.mjs",
  bundle: true,
  platform: "node",
  external: ["onnxruntime-node"],
  target: "node26",
  format: "esm",
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  alias: { "ffmpeg-static": "./server/hosted/decoder.mjs" },
});

execFileSync(process.execPath, ["--check", "server/hosted/bundle.mjs"], { stdio: "inherit" });
