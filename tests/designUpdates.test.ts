import test from "node:test";
import assert from "node:assert/strict";
import {
  DesignUpdates,
  type DesignReceipt,
} from "../src/state/designUpdates.ts";
import {
  defaultOverlayDesign,
  type OverlayDesign,
} from "../shared/overlayDesign.ts";
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
test("rapid design changes preview immediately and coalesce behind one save", async () => {
  const first = deferred<DesignReceipt>(),
    second = deferred<DesignReceipt>();
  const requests: Partial<OverlayDesign>[] = [],
    previews: Partial<OverlayDesign>[] = [];
  const accepted: DesignReceipt[] = [];
  const updates = new DesignUpdates(
    (patch) => {
      requests.push(patch);
      return requests.length === 1 ? first.promise : second.promise;
    },
    (patch) => previews.push(patch),
    (receipt) => accepted.push(receipt),
    assert.fail,
  );
  updates.update({ style: "minimal" });
  updates.update({ style: "signal", color: "#1767ff" });
  updates.update({ style: "press", size: 115 });
  assert.equal(requests.length, 1);
  assert.equal(previews.at(-1)?.style, "press");
  first.resolve({
    design: { ...defaultOverlayDesign, style: "minimal" },
    revision: 1,
  });
  await first.promise;
  await Promise.resolve();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1], {
    style: "press",
    color: "#1767ff",
    size: 115,
  });
  assert.equal(previews.at(-1)?.style, "press");
  second.resolve({
    design: { ...defaultOverlayDesign, ...requests[1] },
    revision: 2,
  });
  await second.promise;
  await Promise.resolve();
  assert.deepEqual(previews.at(-1), {});
  assert.equal(accepted.at(-1)?.design.style, "press");
});
test("failed saves surface errors, release optimistic state, and permit a fresh change", async () => {
  const failed = deferred<DesignReceipt>();
  const errors: string[] = [],
    previews: Partial<OverlayDesign>[] = [];
  let calls = 0;
  const updates = new DesignUpdates(
    () => {
      calls++;
      return calls === 1
        ? failed.promise
        : Promise.resolve({ design: defaultOverlayDesign, revision: 2 });
    },
    (patch) => previews.push(patch),
    () => {},
    (message) => errors.push(message),
  );
  updates.update({ style: "press" });
  failed.reject(new Error("Save unavailable"));
  await failed.promise.catch(() => {});
  await Promise.resolve();
  assert.deepEqual(errors, ["Save unavailable"]);
  assert.deepEqual(previews.at(-1), {});
  updates.update({ style: "bulletin" });
  await Promise.resolve();
  assert.equal(calls, 2);
});
test("disposed design updates cannot publish late acknowledgements", async () => {
  const response = deferred<DesignReceipt>();
  let accepted = false;
  const updates = new DesignUpdates(
    () => response.promise,
    () => {},
    () => {
      accepted = true;
    },
    assert.fail,
  );
  updates.update({ style: "press" });
  updates.dispose();
  response.resolve({ design: defaultOverlayDesign, revision: 1 });
  await response.promise;
  assert.equal(accepted, false);
});
