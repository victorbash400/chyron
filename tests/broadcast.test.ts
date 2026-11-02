import test from "node:test";
import assert from "node:assert/strict";
import {
  encryptStreamKey,
  decryptStreamKey,
} from "../server/broadcast/crypto.ts";
import { encoderArguments, encoderPreset } from "../relay/encoder.ts";
import { authorizationUrl } from "../server/hosted/twitch.ts";
import { BroadcastUplink } from "../src/broadcast/BroadcastUplink.ts";
import type { BroadcastStatus } from "../shared/broadcast.ts";
test("broadcast credentials are encrypted with independent nonces and reject tampering", () => {
  const key = "test-only-stream-key",
    secret = "test-only-encryption-secret";
  const first = encryptStreamKey(key, secret),
    second = encryptStreamKey(key, secret);
  assert.notEqual(first, second);
  assert.equal(first.includes(key), false);
  assert.equal(decryptStreamKey(first, secret), key);
  assert.throws(() => decryptStreamKey(first, "wrong-key"));
  const bytes = Buffer.from(first, "base64");
  bytes[bytes.length - 1] ^= 1;
  assert.throws(() => decryptStreamKey(bytes.toString("base64"), secret));
});
test("broadcast access is requested explicitly and ordinary chat sign-in keeps its existing scopes", () => {
  process.env.APP_ORIGIN = "https://chyron.example";
  process.env.TWITCH_CLIENT_ID = "test-client";
  assert.equal(
    new URL(authorizationUrl("nonce")).searchParams
      .get("scope")
      ?.includes("channel:read:stream_key"),
    false,
  );
  assert.ok(
    new URL(authorizationUrl("nonce", true)).searchParams
      .get("scope")
      ?.split(" ")
      .includes("channel:read:stream_key"),
  );
});
test("encoder reads its destination credential from a private file and produces Twitch-compatible media", () => {
  const args = encoderArguments("/private/credential");
  assert.ok(args.includes("-fpre"));
  assert.equal(args[args.indexOf("-fpre") + 1], "/private/credential");
  assert.equal(args.at(-1), "rtmps://live.twitch.tv:443/app/");
  assert.equal(args[args.indexOf("-c:v") + 1], "libx264");
  assert.equal(args[args.indexOf("-c:a") + 1], "aac");
  assert.equal(args[args.indexOf("-g") + 1], "60");
});
test("broadcast waits for encoder acceptance, reports live output and stops on upload backpressure", () => {
  const previousSocket = globalThis.WebSocket,
    previousRecorder = globalThis.MediaRecorder;
  class Socket {
    static OPEN = 1;
    static instance: Socket;
    readyState = 1;
    bufferedAmount = 0;
    onmessage?: (event: { data: string }) => void;
    onerror?: () => void;
    onclose?: () => void;
    sent: unknown[] = [];
    constructor(
      public url: string,
      public protocols: string[],
    ) {
      Socket.instance = this;
    }
    send(data: unknown) {
      this.sent.push(data);
    }
    close() {
      this.readyState = 3;
    }
  }
  class Recorder {
    static instance: Recorder;
    state = "inactive";
    ondataavailable?: (event: { data: Blob }) => void;
    onerror?: () => void;
    onstop?: () => void;
    constructor() {
      Recorder.instance = this;
    }
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.onstop?.();
    }
  }
  Object.assign(globalThis, { WebSocket: Socket, MediaRecorder: Recorder });
  try {
    const statuses: BroadcastStatus[] = [],
      errors: string[] = [];
    let ended = false;
    const uplink = new BroadcastUplink(
      (value) => statuses.push(value),
      (error) => errors.push(error),
      () => {
        ended = true;
      },
    );
    uplink.connect(
      { url: "wss://relay.example/broadcast", token: "opaque-ticket" },
      {} as MediaStream,
    );
    assert.deepEqual(statuses, ["connecting"]);
    assert.equal(Socket.instance.protocols[0], "chyron.opaque-ticket");
    Socket.instance.onmessage?.({ data: JSON.stringify({ type: "ready" }) });
    assert.equal(Recorder.instance.state, "recording");
    assert.equal(statuses.includes("live"), false);
    Socket.instance.onmessage?.({ data: JSON.stringify({ type: "live" }) });
    assert.equal(statuses.at(-1), "live");
    Socket.instance.bufferedAmount = 8000001;
    Recorder.instance.ondataavailable?.({ data: new Blob(["clip"]) });
    assert.equal(statuses.at(-1), "idle");
    assert.equal(ended, true);
    assert.deepEqual(errors, ["Upload is too slow. Broadcast stopped."]);
    assert.equal(Socket.instance.sent.length, 0);
  } finally {
    Object.assign(globalThis, {
      WebSocket: previousSocket,
      MediaRecorder: previousRecorder,
    });
  }
});

test("preview capture rejects another tab and isolates only the selected element on the current tab", async () => {
  const { capturePreview } = await import("../src/broadcast/capturePreview.ts");
  const previous = new Map(
    ["window", "navigator", "location"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  let handle = "",
    origin = "https://wrong.example",
    stopped = 0,
    restricted = 0;
  const target = {};
  const track = {
    getCaptureHandle: () => ({ handle, origin }),
    restrictTo: async (value: unknown) => {
      assert.equal(value, target);
      restricted++;
    },
    stop: () => stopped++,
  };
  const stream = { getVideoTracks: () => [track], getTracks: () => [track] };
  const devices = {
    setCaptureHandleConfig: (value: { handle: string }) => {
      handle = value.handle;
    },
    getDisplayMedia: async () => stream,
  };
  Object.defineProperties(globalThis, {
    window: {
      configurable: true,
      value: {
        RestrictionTarget: { fromElement: async () => target },
        MediaRecorder: { isTypeSupported: () => true },
      },
    },
    navigator: { configurable: true, value: { mediaDevices: devices } },
    location: {
      configurable: true,
      value: { origin: "https://chyron.example" },
    },
  });
  try {
    await assert.rejects(capturePreview({} as HTMLElement), {
      message: "Select this Chyron tab to broadcast the preview.",
    });
    assert.equal(stopped, 1);
    assert.equal(restricted, 0);
    origin = "https://chyron.example";
    assert.equal(await capturePreview({} as HTMLElement), stream);
    assert.equal(restricted, 1);
    assert.equal(stopped, 1);
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test("the actual encoder command reads a private preset and transcodes browser WebM to H264 and AAC", async () => {
  const { default: ffmpeg } = await import("ffmpeg-static");
  const { spawnSync } = await import("node:child_process");
  const { mkdtemp, writeFile, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  assert.ok(ffmpeg);
  const directory = await mkdtemp(join(tmpdir(), "chyron-encoder-test-"));
  try {
    const input = join(directory, "input.webm"),
      preset = join(directory, "preset"),
      output = join(directory, "output.flv");
    const generated = spawnSync(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=320x180:rate=30",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=48000:cl=stereo",
        "-t",
        "1",
        "-c:v",
        "libvpx",
        "-deadline",
        "realtime",
        "-c:a",
        "libopus",
        input,
      ],
      { encoding: "utf8", timeout: 15000 },
    );
    assert.equal(generated.status, 0, generated.stderr);
    await writeFile(preset, encoderPreset("synthetic-test-key", true), {
      mode: 0o600,
    });
    const args = encoderArguments(preset);
    args[args.length - 1] = output;
    const encoded = spawnSync(ffmpeg, args, {
      input: await readFile(input),
      encoding: "utf8",
      timeout: 15000,
    });
    assert.equal(encoded.status, 0, encoded.stderr);
    assert.ok(encoded.stdout.includes("progress=end"));
    assert.ok((await readFile(output)).length > 1000);
    assert.throws(() => encoderPreset("key\nmalicious=option", false));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
