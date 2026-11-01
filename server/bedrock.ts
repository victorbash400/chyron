import { getTokenProvider } from "@aws/bedrock-token-generator";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Agent, fetch as request } from "undici";
import { awsLookup } from "./aws-dns.ts";
import { required, region } from "./config.ts";
const dispatcher = new Agent({
  connect: { lookup: awsLookup, family: 4, timeout: 10000 },
  headersTimeout: 50000,
  bodyTimeout: 50000,
});
let provideToken: ReturnType<typeof getTokenProvider> | undefined;
export async function bedrockModel(
  mode: "fast" | "reasoning" | "audio" = "fast",
) {
  const audio = mode === "audio";
  provideToken ??= getTokenProvider({
    region: region(),
    expiresInSeconds: 300,
  });
  const token = await provideToken();
  const provider = createOpenAICompatible({
    name: "chyron-bedrock",
    baseURL: audio
      ? new URL("/openai/v1", required("BEDROCK_BASE_URL")).href
      : required("BEDROCK_BASE_URL"),
    supportsStructuredOutputs: audio,
    fetch: (url, options) =>
      (request as unknown as typeof fetch)(url, {
        ...options,
        dispatcher,
      } as RequestInit & { dispatcher: Agent }),
    headers: {
      Authorization: `Bearer ${token}`,
      "OpenAI-Project": required("BEDROCK_PROJECT_ID"),
    },
  });
  return provider.chatModel(
    required(
      audio
        ? "BEDROCK_AUDIO_MODEL_ID"
        : mode === "reasoning"
          ? "BEDROCK_REASONING_MODEL_ID"
          : "BEDROCK_MODEL_ID",
    ),
  );
}
