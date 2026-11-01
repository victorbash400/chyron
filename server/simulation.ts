import { randomUUID } from "node:crypto";
import type { ChatMessage } from "../shared/types.ts";
const discussions = {
  keyboard: [
    ["pixelpilot", "You spent $300 on a keyboard?"],
    ["moss", "If it makes you happy then it was worth it"],
    ["keystroke", "Three hundred dollars and no backlight is criminal pricing"],
    ["orbit", "Those keys better do your taxes"],
    ["moss", "Wait there is actually no backlight? I take it back"],
    ["pixelpilot", "Chat has officially turned on the keyboard purchase"],
  ],
  reversal: [
    ["moss", "Update: the keyboard was a gift from their grandmother"],
    ["orbit", "I withdraw every keyboard joke immediately"],
    ["pixelpilot", "Grandma has excellent taste actually"],
    [
      "keystroke",
      "This chat went from consumer watchdog to family appreciation so fast",
    ],
  ],
} satisfies Record<string, string[][]>;
export function simulationMessages(
  scenario: keyof typeof discussions,
): ChatMessage[] {
  return discussions[scenario].map(([author, text], index) => ({
    id: randomUUID(),
    userId: `sim-${author}`,
    author,
    text,
    at: Date.now() + index,
    source: "simulation",
  }));
}
