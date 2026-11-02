import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir(".relay-build", { recursive: true });
await build({
  entryPoints: ["relay/index.ts"],
  outfile: ".relay-build/relay.mjs",
  bundle: true,
  platform: "node",
  target: "node26",
  format: "esm",
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
