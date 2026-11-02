import { useEffect, useRef, useState } from "react";
import { Camera, Monitor, Video, X } from "lucide-react";
import IconButton from "./controls/IconButton.tsx";
import "./PreviewSourceMenu.css";
export default function PreviewSourceMenu({
  active,
  disabled,
  onSelect,
  onRemove,
}: {
  active: boolean;
  disabled: boolean;
  onSelect: (source: "camera" | "screen") => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="preview-source-menu"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <IconButton
        ref={trigger}
        label="Preview video source"
        title="Preview video source"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <Video />
      </IconButton>
      {open && (
        <div className="preview-source-options">
          <button
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
              onSelect("camera");
            }}
          >
            <Camera />
            Camera
          </button>
          <button
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
              onSelect("screen");
            }}
          >
            <Monitor />
            Screen
          </button>
          {active && (
            <button
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
                onRemove();
              }}
            >
              <X />
              Remove video
            </button>
          )}
        </div>
      )}
    </div>
  );
}
