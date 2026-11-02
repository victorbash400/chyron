import { waitUntil } from "@vercel/functions";
import { handleRequest } from "./handler.ts";
export const maxDuration = 300;
export default {
  fetch: (request: Request) => handleRequest(request, waitUntil),
};
