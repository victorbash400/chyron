import { defaultCoverageSettings } from "../../shared/coverageSettings.ts";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import { randomBytes } from "node:crypto";
import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { StreamerAccount } from "../../shared/session.ts";
import type { NewsroomState, ChatMessage } from "../../shared/types.ts";
import { Newsroom } from "../newsroom.ts";
import { getDatabase, records, tableName } from "./records.ts";
import { tokenHash } from "./sessions.ts";
export interface RoomSnapshot {
  state: NewsroomState;
  overlayToken: string;
  conversationId: string;
  version: number;
  revision: number;
  received: number;
  processed: number;
  lastAnalysisAt: number;
  leaseOwner: string;
  leaseUntil: number;
  simulationId: string;
  audioOwner: string;
  audioUntil: number;
}
export const roomKey = (userId: string) => ({
  pk: `USER#${userId}`,
  sk: "NEWSROOM",
});
function snapshot(item: Record<string, unknown>): RoomSnapshot {
  const data = item.data as { state: NewsroomState; overlayToken: string };
  return {
    ...item,
    ...data,
    state: {
      ...data.state,
      coverage: { ...defaultCoverageSettings, ...data.state.coverage },
      revision: item.revision as number,
      working: Number(item.leaseUntil) > Date.now(),
    },
  } as RoomSnapshot;
}
export async function ensureRoom(account: StreamerAccount) {
  const existing = await getDatabase().send(
    new GetCommand({
      TableName: tableName(),
      Key: roomKey(account.id),
      ConsistentRead: true,
    }),
  );
  if (existing.Item) return getRoom(account.id);
  const room = new Newsroom();
  const state = {
    ...room.state,
    channel: { id: account.id, name: account.name },
  };
  room.dispose();
  const overlayToken = randomBytes(32).toString("hex");
  try {
    await getDatabase().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: tableName(),
              Item: {
                ...roomKey(account.id),
                data: { state, overlayToken },
                conversationId: state.sourceId,
                version: 1,
                revision: 1,
                received: 0,
                processed: 0,
                lastAnalysisAt: 0,
                leaseOwner: "",
                leaseUntil: 0,
                simulationId: "",
                audioOwner: "",
                audioUntil: 0,
              },
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Put: {
              TableName: tableName(),
              Item: {
                pk: `OVERLAY#${tokenHash(overlayToken)}`,
                sk: "TOKEN",
                data: { userId: account.id },
              },
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
        ],
      }),
    );
  } catch (error) {
    const raced = await getDatabase().send(
      new GetCommand({
        TableName: tableName(),
        Key: roomKey(account.id),
        ConsistentRead: true,
      }),
    );
    if (!raced.Item) throw error;
  }
  return getRoom(account.id);
}
export async function getMetadata(userId: string): Promise<RoomSnapshot> {
  const result = await getDatabase().send(
    new GetCommand({
      TableName: tableName(),
      Key: roomKey(userId),
      ConsistentRead: true,
    }),
  );
  if (!result.Item) throw new Error("Connect Twitch first.");
  return snapshot(result.Item);
}
export async function getRoom(userId: string): Promise<RoomSnapshot> {
  const room = await getMetadata(userId);
  const messages = await getDatabase().send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": `MESSAGE#${room.conversationId}#`,
      },
      ScanIndexForward: false,
      ConsistentRead: true,
      Limit: 200,
    }),
  );
  room.state.messages = (messages.Items ?? [])
    .map((item) => item.data as ChatMessage)
    .filter(
      (message) =>
        message.source === "audio" ||
        message.at > (room.state.chatClearedAt ?? 0),
    )
    .reverse();
  return room;
}
export async function changeRoom(
  userId: string,
  mutate: (room: RoomSnapshot) => void,
): Promise<RoomSnapshot> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const room = await getRoom(userId);
    const previous = room.version;
    mutate(room);
    const data = {
      state: { ...room.state, messages: [] },
      overlayToken: room.overlayToken,
    };
    try {
      await getDatabase().send(
        new UpdateCommand({
          TableName: tableName(),
          Key: roomKey(userId),
          UpdateExpression:
            "SET #data = :data, conversationId = :conversation, #version = :next, #processed = :processed, lastAnalysisAt = :last, leaseOwner = :owner, leaseUntil = :until, simulationId = :simulation, audioOwner = :audioOwner, audioUntil = :audioUntil ADD revision :one",
          ConditionExpression: "#version = :previous",
          ExpressionAttributeNames: {
            "#data": "data",
            "#version": "version",
            "#processed": "processed",
          },
          ExpressionAttributeValues: {
            ":data": data,
            ":conversation": room.conversationId,
            ":next": previous + 1,
            ":previous": previous,
            ":processed": room.processed,
            ":last": room.lastAnalysisAt,
            ":owner": room.leaseOwner,
            ":until": room.leaseUntil,
            ":simulation": room.simulationId,
            ":audioOwner": room.audioOwner,
            ":audioUntil": room.audioUntil,
            ":one": 1,
          },
        }),
      );
      return getRoom(userId);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.name !== "ConditionalCheckFailedException"
      )
        throw error;
    }
  }
  throw new Error("Account settings changed concurrently. Try again.");
}
export async function appendMessage(
  userId: string,
  context: Pick<RoomSnapshot, "state" | "conversationId">,
  message: ChatMessage,
  simulation?: { id: string; delivered: number; total: number },
) {
  const requiresActive = message.source !== "chat";
  const condition =
    "conversationId = :conversation" +
    (requiresActive
      ? " AND #data.#state.sourceId = :source AND #data.#state.paused = :paused"
      : "") +
    (simulation ? " AND simulationId = :simulation" : "");
  const values: Record<string, unknown> = {
    ":conversation": context.conversationId,
    ":one": 1,
  };
  const names: Record<string, string> = {};
  if (requiresActive || simulation) {
    names["#data"] = "data";
    names["#state"] = "state";
  }
  if (requiresActive) {
    values[":source"] = context.state.sourceId;
    values[":paused"] = false;
  }
  let update = "ADD received :one, revision :one";
  if (simulation) {
    values[":simulation"] = simulation.id;
    values[":progress"] = {
      batchId: simulation.id,
      status: simulation.delivered === simulation.total ? "idle" : "running",
      delivered: simulation.delivered,
      total: simulation.total,
    };
    names["#version"] = "version";
    update =
      "SET #data.#state.simulator = :progress " + update + ", #version :one";
  }
  try {
    await getDatabase().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: tableName(),
              Item: {
                pk: `USER#${userId}`,
                sk: `SEEN#${context.conversationId}#${message.id}`,
                expiresAt: Math.floor(Date.now() / 1000) + 86400,
              },
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Put: {
              TableName: tableName(),
              Item: {
                pk: `USER#${userId}`,
                sk: `MESSAGE#${context.conversationId}#${String(message.at).padStart(13, "0")}#${message.id}`,
                data: message,
                expiresAt: Math.floor(Date.now() / 1000) + 86400,
              },
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Update: {
              TableName: tableName(),
              Key: roomKey(userId),
              UpdateExpression: update,
              ConditionExpression: condition,
              ...(Object.keys(names).length
                ? { ExpressionAttributeNames: names }
                : {}),
              ExpressionAttributeValues: values,
            },
          },
        ],
      }),
    );
    return true;
  } catch (error) {
    if (
      error instanceof TransactionCanceledException &&
      error.CancellationReasons?.some(
        (reason) => reason.Code === "ConditionalCheckFailed",
      )
    )
      return false;
    throw error;
  }
}
export async function acquireCoverage(userId: string, owner: string) {
  try {
    await getDatabase().send(
      new UpdateCommand({
        TableName: tableName(),
        Key: roomKey(userId),
        UpdateExpression:
          "SET leaseOwner = :owner, leaseUntil = :until ADD #version :one, revision :one",
        ConditionExpression:
          "leaseUntil < :now AND #data.#state.paused = :paused",
        ExpressionAttributeNames: {
          "#version": "version",
          "#data": "data",
          "#state": "state",
        },
        ExpressionAttributeValues: {
          ":owner": owner,
          ":until": Date.now() + 120000,
          ":now": Date.now(),
          ":one": 1,
          ":paused": false,
        },
      }),
    );
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    )
      return false;
    throw error;
  }
}
export async function releaseCoverage(
  userId: string,
  owner: string,
  received?: number,
) {
  try {
    await getDatabase().send(
      new UpdateCommand({
        TableName: tableName(),
        Key: roomKey(userId),
        UpdateExpression:
          "SET leaseOwner = :empty, leaseUntil = :zero ADD #version :one, revision :one",
        ConditionExpression:
          "leaseOwner = :owner" +
          (received === undefined ? "" : " AND received = :received"),
        ExpressionAttributeNames: { "#version": "version" },
        ExpressionAttributeValues: {
          ":owner": owner,
          ":empty": "",
          ":zero": 0,
          ":one": 1,
          ...(received === undefined ? {} : { ":received": received }),
        },
      }),
    );
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    )
      return false;
    throw error;
  }
}
export async function overlayOwner(token: string) {
  if (token.length !== 64) return null;
  return (
    (await records.get<{ userId: string }>({
      pk: `OVERLAY#${tokenHash(token)}`,
      sk: "TOKEN",
    })) ?? null
  );
}
