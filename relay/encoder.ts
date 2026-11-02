import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
export interface Encoder {
  write: (data: Buffer) => boolean;
  end: () => void;
  kill: () => void;
  onDrain: (handler: () => void) => void;
}
export function encoderPreset(streamKey: string, test: boolean) {
  if (
    !streamKey ||
    streamKey.length > 512 ||
    ["\r", "\n", "\0"].some((character) => streamKey.includes(character))
  )
    throw new Error("Invalid Twitch stream key.");
  return `rtmp_playpath=${streamKey}${test ? "?bandwidthtest=true" : ""}\n`;
}
export function encoderArguments(keyPath: string) {
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-thread_queue_size",
    "512",
    "-f",
    "webm",
    "-i",
    "pipe:0",
    "-map",
    "0:v:0",
    "-map",
    "0:a:0",
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    "3000k",
    "-maxrate",
    "3000k",
    "-bufsize",
    "6000k",
    "-g",
    "60",
    "-keyint_min",
    "60",
    "-sc_threshold",
    "0",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "48000",
    "-progress",
    "pipe:1",
    "-stats_period",
    "1",
    "-fpre",
    keyPath,
    "-rtmp_app",
    "app",
    "-f",
    "flv",
    "rtmps://live.twitch.tv:443/app/",
  ];
}
export async function createEncoder(
  streamKey: string,
  test: boolean,
  onLive: () => void,
  onExit: (ok: boolean) => void,
): Promise<Encoder> {
  const preset = encoderPreset(streamKey, test);
  const directory = await mkdtemp(
    join(process.env.BROADCAST_TMP_DIR ?? tmpdir(), "chyron-broadcast-"),
  );
  const keyPath = join(directory, "credential");
  let child: ChildProcessWithoutNullStreams;
  try {
    await writeFile(keyPath, preset, { mode: 0o600 });
    child = spawn(
      process.env.FFMPEG_PATH ?? "ffmpeg",
      encoderArguments(keyPath),
      { stdio: ["pipe", "pipe", "pipe"] },
    );
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  let buffer = "",
    live = false,
    exited = false;
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const separator = line.indexOf("=");
      if (
        line.slice(0, separator) === "out_time_us" &&
        Number(line.slice(separator + 1)) > 0 &&
        !live
      ) {
        live = true;
        onLive();
      }
    }
    if (buffer.length > 10000) child.kill("SIGTERM");
  });
  // Encoder diagnostics can contain the destination credential; never log them.
  child.stderr.resume();
  const finish = (ok: boolean) => {
    if (exited) return;
    exited = true;
    void rm(directory, { recursive: true, force: true }).then(
      () => onExit(ok),
      () => onExit(false),
    );
  };
  child.on("error", () => finish(false));
  child.on("close", (code) => finish(code === 0));
  child.stdin.on("error", () => {
    child.kill("SIGTERM");
  });
  return {
    write: (data) => child.stdin.write(data),
    end: () => child.stdin.end(),
    kill: () => child.kill("SIGKILL"),
    onDrain: (handler) => child.stdin.once("drain", handler),
  };
}
