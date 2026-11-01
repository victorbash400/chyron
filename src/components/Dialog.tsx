import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import IconButton from "./controls/IconButton.tsx";
import "./Dialog.css";
export default function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      className="dialog"
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-heading">
          <h2>{title}</h2>
          <IconButton
            className="dialog-close"
            label="Close dialog"
            onClick={onClose}
          >
            <X />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  );
}
