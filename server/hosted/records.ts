import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { awsConfiguration } from "../aws.ts";
import { required } from "../config.ts";
let client: DynamoDBDocumentClient | undefined;
export function getDatabase() {
  client ??= DynamoDBDocumentClient.from(
    new DynamoDBClient(awsConfiguration()),
    { marshallOptions: { removeUndefinedValues: true } },
  );
  return client;
}
export const tableName = () => required("DYNAMODB_TABLE_NAME");
export interface RecordKey {
  pk: string;
  sk: string;
}
export interface RecordOptions {
  expiresAt?: number;
  onlyIfAbsent?: boolean;
}
export interface RecordStore {
  get<T>(key: RecordKey): Promise<T | undefined>;
  put(key: RecordKey, data: unknown, options?: RecordOptions): Promise<void>;
  remove(key: RecordKey): Promise<void>;
}
export const records: RecordStore = {
  async get<T>(key: RecordKey) {
    const result = await getDatabase().send(
      new GetCommand({
        TableName: tableName(),
        Key: key,
        ConsistentRead: true,
      }),
    );
    const item = result.Item;
    if (
      !item ||
      (item.expiresAt !== undefined && item.expiresAt <= Date.now() / 1000)
    )
      return undefined;
    return item.data as T;
  },
  async put(key, data, options = {}) {
    await getDatabase().send(
      new PutCommand({
        TableName: tableName(),
        Item: { ...key, data, expiresAt: options.expiresAt },
        ...(options.onlyIfAbsent
          ? { ConditionExpression: "attribute_not_exists(pk)" }
          : {}),
      }),
    );
  },
  async remove(key) {
    await getDatabase().send(
      new DeleteCommand({ TableName: tableName(), Key: key }),
    );
  },
};
