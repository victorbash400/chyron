import type { CoverageSettings } from "./coverageSettings.ts";
import type { ChatMessage } from "./types.ts";

export function includesCoverageSource(
  message: ChatMessage,
  settings: CoverageSettings,
) {
  return message.source === "audio"
    ? settings.includeAudio
    : settings.includeChat;
}

export function coverageInput(
  messages: ChatMessage[],
  settings: CoverageSettings,
  now = Date.now(),
) {
  return messages.filter(
    (message) =>
      now - message.at < settings.contextSeconds * 1000 &&
      includesCoverageSource(message, settings),
  );
}

export function sameCoverageSources(
  left: CoverageSettings,
  right: CoverageSettings,
) {
  return (
    left.includeChat === right.includeChat &&
    left.includeAudio === right.includeAudio
  );
}
