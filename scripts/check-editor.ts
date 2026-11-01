import assert from "node:assert/strict";
import { Newsroom } from "../server/newsroom.ts";
import { writeCoverage } from "../server/editor.ts";
import { simulationMessages } from "../server/simulation.ts";
const room = new Newsroom(writeCoverage, async () => {});
try {
  room.state.mode = "simulation";
  room.state.messages = simulationMessages("keyboard");
  const start = Date.now();
  await room.process();
  assert.equal(
    room.state.stories.length,
    1,
    "The first discussion should produce one story.",
  );
  const id = room.state.stories[0].id;
  room.state.stories[0].published = true;
  console.log("Initial story:", room.state.stories[0].headline);
  room.state.messages.push(...simulationMessages("reversal"));
  await room.process();
  assert.equal(
    room.state.stories.length,
    1,
    "The plot twist should update the existing story.",
  );
  assert.equal(room.state.stories[0].id, id);
  assert.equal(room.state.stories[0].published, true);
  console.log("Developing story:", room.state.stories[0].headline);
  console.log("Two editorial passes completed in", Date.now() - start, "ms.");
} finally {
  room.dispose();
}
