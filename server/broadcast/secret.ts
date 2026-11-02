import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { awsConfiguration } from "../aws.ts";
import { required } from "../config.ts";
let cached: Promise<string> | undefined;
export function broadcastSecret() {
  cached ??= new SecretsManagerClient(awsConfiguration())
    .send(
      new GetSecretValueCommand({ SecretId: required("BROADCAST_SECRET_ARN") }),
    )
    .then((result) => {
      if (!result.SecretString)
        throw new Error("Broadcast credential unavailable.");
      return result.SecretString;
    })
    .catch((error) => {
      cached = undefined;
      throw error;
    });
  return cached;
}
