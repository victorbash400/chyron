import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { Agent } from "node:https";
import { awsLookup } from "./aws-dns.ts";
import { region } from "./config.ts";
export const credentials = process.env.AWS_ROLE_ARN
  ? awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN })
  : fromNodeProviderChain();
const httpsAgent = new Agent({ keepAlive: true, lookup: awsLookup });
export function awsConfiguration() {
  return {
    region: region(),
    credentials,
    maxAttempts: 1,
    requestHandler: {
      connectionTimeout: 10000,
      requestTimeout: 15000,
      throwOnRequestTimeout: true,
      httpsAgent,
    },
  };
}
