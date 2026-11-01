import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { required } from "./config.ts";
import { awsConfiguration } from "./aws.ts";
const client = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient(awsConfiguration()), {
    marshallOptions: { removeUndefinedValues: true },
  });
export function installationId() {
  return createHash("sha256")
    .update(required("COOKIE_SECRET"))
    .digest("hex")
    .slice(0, 24);
}
function key(sk: string) {
  return { pk: `INSTALLATION#${installationId()}`, sk };
}
export async function readRecord<T>(sk: string): Promise<T | undefined> {
  const result = await client().send(
    new GetCommand({
      TableName: required("DYNAMODB_TABLE_NAME"),
      Key: key(sk),
      ConsistentRead: true,
    }),
  );
  return result.Item?.data as T | undefined;
}
export async function writeRecord(sk: string, data: unknown) {
  await client().send(
    new PutCommand({
      TableName: required("DYNAMODB_TABLE_NAME"),
      Item: { ...key(sk), data },
    }),
  );
}
export async function deleteRecord(sk: string) {
  await client().send(
    new DeleteCommand({
      TableName: required("DYNAMODB_TABLE_NAME"),
      Key: key(sk),
    }),
  );
}
const encryptionKey = () =>
  createHash("sha256").update(required("COOKIE_SECRET")).digest();
export function seal(data: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const payload = Buffer.concat([
    cipher.update(JSON.stringify(data)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), payload]).toString("base64");
}
export function unseal<T>(value: string): T {
  const bytes = Buffer.from(value, "base64");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    bytes.subarray(0, 12),
  );
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ]).toString(),
  ) as T;
}
