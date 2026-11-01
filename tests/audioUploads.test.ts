import test from "node:test";
import assert from "node:assert/strict";
import { AudioUploads } from "../src/state/audioUploads.ts";
test("audio uploads serialize clips and carry the capture source identity", async () => {
  const requests: RequestInit[] = [];
  const pending: number[] = [];
  const texts: string[] = [];
  let release!: (value: Response) => void;
  const request = (async (_url: unknown, options: RequestInit) => {
    requests.push(options);
    return requests.length === 1
      ? new Promise<Response>((resolve) => {
          release = resolve;
        })
      : Response.json({ transcript: "Second clip", status: "speech" });
  }) as typeof fetch;
  const queue = new AudioUploads(
    (count) => pending.push(count),
    (result) => texts.push(result.transcript),
    assert.fail,
    request,
  );
  queue.enqueue(new Blob(["first"]), "audio/webm;codecs=opus", "source-a");
  queue.enqueue(new Blob(["second"]), "audio/webm", "source-a");
  assert.equal(requests.length, 1);
  assert.equal(pending.at(-1), 2);
  release(Response.json({ transcript: "First clip", status: "speech" }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests.length, 2);
  assert.deepEqual(texts, ["First clip", "Second clip"]);
  assert.equal(
    (requests[0]?.headers as Record<string, string>)["X-Chyron-Source"],
    "source-a",
  );
  assert.equal(pending.at(-1), 0);
  queue.dispose();
});
test("audio errors are visible and queued clips are not sent after failure", async () => {
  const errors: string[] = [];
  let calls = 0;
  const queue = new AudioUploads(
    () => {},
    () => assert.fail("Unexpected transcript"),
    (message) => errors.push(message),
    (async () => {
      calls++;
      return Response.json({ error: "Source changed" }, { status: 409 });
    }) as typeof fetch,
  );
  queue.enqueue(new Blob(["a"]), "audio/wav", "old");
  queue.enqueue(new Blob(["b"]), "audio/wav", "old");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(errors, ["Source changed"]);
  assert.equal(calls, 1);
  queue.dispose();
});

test("browser fetch is invoked without binding it to the queue instance", async () => {
  let called = false;
  const request = function (this: unknown) {
    assert.equal(this, undefined);
    called = true;
    return Promise.resolve(
      Response.json({ transcript: "", status: "silence" }),
    );
  } as typeof fetch;
  const queue = new AudioUploads(
    () => {},
    () => {},
    assert.fail,
    request,
  );
  queue.enqueue(new Blob(["audio"]), "audio/wav", "source");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(called, true);
  queue.dispose();
});
