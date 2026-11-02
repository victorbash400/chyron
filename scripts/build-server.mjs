import { build } from "esbuild";
import { copyFile } from "node:fs/promises";
import ffmpeg from "ffmpeg-static";
if (!ffmpeg) throw new Error("Audio decoder unavailable.");
await copyFile(ffmpeg, "server/hosted/ffmpeg");
await build({
  entryPoints: ["server/hosted/entry.ts"],
  outfile: "server/hosted/bundle.mjs",
  bundle: true,
  platform: "node",
  target: "node26",
  format: "esm",
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  alias: { "ffmpeg-static": "./server/hosted/decoder.mjs" },
});
