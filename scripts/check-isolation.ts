import assert from "node:assert/strict";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { awsConfiguration } from "../server/aws.ts";
const client = new DynamoDBClient(awsConfiguration());
await assert.rejects(
  client.send(new DescribeTableCommand({ TableName: "BetterSide-dev" })),
  (error) => error instanceof Error && error.name === "AccessDeniedException",
);
console.log("Chyron runtime cannot access the BetterSide table.");
