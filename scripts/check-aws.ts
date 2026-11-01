import assert from "node:assert/strict";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { writeRecord, readRecord, deleteRecord } from "../server/store.ts";
import { awsConfiguration } from "../server/aws.ts";
import { writeCoverage } from "../server/editor.ts";
const id = `CHECK#${randomUUID()}`;
try {
  await writeRecord(id, { ok: true });
  assert.deepEqual(await readRecord(id), { ok: true });
  console.log("DynamoDB write/read passed.");
} finally {
  await deleteRecord(id);
}
const s3 = new S3Client(awsConfiguration());
const key = `checks/${randomUUID()}.txt`;
try {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: "chyron-check",
    }),
  );
  const result = await s3.send(
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key }),
  );
  assert.equal(await result.Body?.transformToString(), "chyron-check");
  console.log("S3 write/read passed.");
} finally {
  await s3.send(
    new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key }),
  );
}
const at = Date.now();
const result = await writeCoverage(
  [
    {
      id: "m1",
      userId: "a",
      author: "ada",
      text: "You spent 300 dollars on a keyboard without backlighting?",
      at,
      source: "chat",
    },
    {
      id: "m2",
      userId: "b",
      author: "bea",
      text: "For 300 dollars those keys should do my taxes",
      at,
      source: "chat",
    },
    {
      id: "m3",
      userId: "c",
      author: "cam",
      text: "The keyboard sounds great but I cannot defend the price",
      at,
      source: "chat",
    },
  ],
  [],
);
assert.ok(
  result.stories.length > 0,
  "Expected a story from the test discussion.",
);
assert.ok(
  result.stories.every((s) =>
    s.messageIds.every((id) => ["m1", "m2", "m3"].includes(id)),
  ),
);
console.log("Bedrock structured coverage passed:", result.stories[0].headline);
