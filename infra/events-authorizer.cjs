const { createHash } = require("node:crypto");
const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const client = new DynamoDBClient({ maxAttempts: 1 });
exports.handler = async (event) => {
  const token = event.authorizationToken;
  if (typeof token !== "string" || token.length > 200) return { isAuthorized: false };
  const overlay = token.startsWith("overlay:");
  if (!overlay && !token.startsWith("session:")) return { isAuthorized: false };
  const raw = token.slice(8);
  if (raw.length < 32) return { isAuthorized: false };
  const hash = createHash("sha256").update(raw).digest("hex");
  const result = await client.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: { pk: { S: `${overlay ? "OVERLAY" : "CAPABILITY"}#${hash}` }, sk: { S: "TOKEN" } },
    ConsistentRead: true,
  }));
  const item = result.Item;
  if (!item || (item.expiresAt && Number(item.expiresAt.N) <= Date.now() / 1000)) return { isAuthorized: false };
  const userId = item.data?.M?.userId?.S;
  if (!userId) return { isAuthorized: false };
  if (!overlay) {
    const sessionId = item.data?.M?.sessionId?.S;
    if (!sessionId) return { isAuthorized: false };
    const session = await client.send(new GetItemCommand({ TableName: process.env.TABLE_NAME, Key: { pk: { S: `USER#${userId}` }, sk: { S: `SESSION#${sessionId}` } }, ConsistentRead: true }));
    if (!session.Item || Number(session.Item.expiresAt?.N ?? 0) <= Date.now() / 1000) return { isAuthorized: false };
  }
  const operation = event.requestContext?.operation;
  const channel = event.requestContext?.channel;
  const allowed = operation === "EVENT_CONNECT" ||
    (operation === "EVENT_SUBSCRIBE" && channel === `/${overlay ? "overlay" : "newsroom"}/${userId}`);
  return { isAuthorized: allowed, ttlOverride: 0 };
};
