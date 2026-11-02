import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { tokenHash } from "../server/hosted/sessions.ts";
import { getDatabase, tableName } from "../server/hosted/records.ts";
import { decryptStreamKey } from "../server/broadcast/crypto.ts";
import { broadcastSecret } from "../server/broadcast/secret.ts";
import type { RelayTicketRecord } from "../server/hosted/broadcast.ts";
import { z } from "zod";
export async function consumeTicket(token: string) {
  if (
    token.length !== 64 ||
    [...token].some((character) => !"0123456789abcdef".includes(character))
  )
    throw new Error("Invalid broadcast ticket.");
  const result = await getDatabase().send(
    new DeleteCommand({
      TableName: tableName(),
      Key: { pk: `BROADCAST#${tokenHash(token)}`, sk: "TOKEN" },
      ConditionExpression: "expiresAt > :now",
      ExpressionAttributeValues: { ":now": Math.floor(Date.now() / 1000) },
      ReturnValues: "ALL_OLD",
    }),
  );
  const record: RelayTicketRecord = z
    .object({
      userId: z.string().min(1),
      envelope: z.string().min(1),
      test: z.boolean(),
    })
    .parse(result.Attributes?.data);
  return {
    userId: record.userId,
    streamKey: decryptStreamKey(record.envelope, await broadcastSecret()),
    test: record.test,
  };
}
