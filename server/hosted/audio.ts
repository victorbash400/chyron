import { randomUUID } from "node:crypto";
import { transcribe } from "../transcription.ts";
import { appendMessage, changeRoom, getRoom } from "./rooms.ts";
import { HttpError } from "./http.ts";
export async function receiveAudio(userId: string, request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0];
  if (
    !type ||
    ![
      "audio/webm",
      "audio/mp4",
      "audio/ogg",
      "audio/wav",
      "audio/mpeg",
    ].includes(type)
  )
    throw new HttpError(415, "Send an audio recording.");
  const data = Buffer.from(await request.arrayBuffer());
  if (!data.length || data.length > 4000000)
    throw new HttpError(413, "Record up to 4 MB of audio.");
  const sourceId = request.headers.get("x-chyron-source");
  const owner = randomUUID();
  const room = await changeRoom(userId, (current) => {
    if (current.state.paused)
      throw new HttpError(409, "Resume coverage before adding audio.");
    if (sourceId !== current.state.sourceId)
      throw new HttpError(409, "Audio source changed. Start capture again.");
    if (current.audioUntil > Date.now())
      throw new HttpError(409, "Audio transcription is already running.");
    current.audioOwner = owner;
    current.audioUntil = Date.now() + 90000;
  });
  try {
    const result = await transcribe(data);
    const current = await getRoom(userId);
    if (
      sourceId !== current.state.sourceId ||
      current.state.paused ||
      current.audioOwner !== owner
    )
      throw new HttpError(
        409,
        "Source changed during transcription. Record again.",
      );
    if (result.status !== "speech") return result;
    const added = await appendMessage(userId, room, {
      id: randomUUID(),
      userId: "streamer-audio",
      author: room.state.channel?.name ?? "Streamer",
      text: result.transcript,
      at: Date.now(),
      source: "audio",
    });
    if (!added)
      throw new HttpError(409, "Audio source changed. Start capture again.");
    return result;
  } finally {
    await changeRoom(userId, (current) => {
      if (current.audioOwner === owner) {
        current.audioUntil = 0;
        current.audioOwner = "";
      }
    });
  }
}
