import { Agent } from "node:https";
import { awsLookup } from "./aws-dns.ts";
import { region } from "./config.ts";
const httpsAgent = new Agent({ keepAlive: true, lookup: awsLookup });
export function awsConfiguration() {
  return {
    region: region(),
    maxAttempts: 1,
    requestHandler: {
      connectionTimeout: 10000,
      requestTimeout: 15000,
      throwOnRequestTimeout: true,
      httpsAgent,
    },
  };
}
