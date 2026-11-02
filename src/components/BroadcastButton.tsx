import { Radio, Square, LoaderCircle } from "lucide-react";
import type { BroadcastStatus } from "../../shared/broadcast.ts";
import "./BroadcastButton.css";
import IconButton from "./controls/IconButton.tsx";
export default function BroadcastButton({
  status,
  onStart,
  onStop,
}: {
  status: BroadcastStatus;
  onStart: () => void;
  onStop: () => void;
}) {
  const active = status !== "idle";
  const label =
    status === "idle"
      ? "Broadcast from browser"
      : status === "live"
        ? "Stop broadcast"
        : status === "stopping"
          ? "Stopping broadcast"
          : "Cancel broadcast";
  return (
    <IconButton
      label={label}
      title={label}
      selected={status === "live"}
      aria-busy={active && status !== "live"}
      disabled={status === "stopping"}
      onClick={active ? onStop : onStart}
    >
      {status === "live" ? (
        <Square />
      ) : active ? (
        <LoaderCircle className="broadcast-pending" />
      ) : (
        <Radio />
      )}
    </IconButton>
  );
}
