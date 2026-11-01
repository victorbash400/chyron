import { useEffect, useRef, useState } from "react";
import { Camera, Monitor, Video, X } from "lucide-react";
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
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        className="icon-button"
        aria-label="Preview video source"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <Video />
      </button>
      {open && (
        <div className="preview-source-options">
          <button
            onClick={() => {
              setOpen(false);
              onSelect("camera");
            }}
          >
            <Camera />
            Camera
          </button>
          <button
            onClick={() => {
              setOpen(false);
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
