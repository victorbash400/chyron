import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert } from "lucide-react";
import "./ErrorNotice.css";
export default function ErrorNotice({
  error,
  onRetry,
  onDismiss,
  retryLabel = "Retry",
}: {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="error-notice"
      role="alertdialog"
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss?.();
      }}
    >
      <TriangleAlert className="error-notice-symbol" aria-hidden="true" />
      <h2 id={title}>{error}</h2>
      <div className="error-notice-actions">
        {onRetry && (
          <button className="error-notice-retry" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
        {onDismiss && (
          <button
            className="error-notice-confirm"
            autoFocus
            onClick={onDismiss}
          >
            OK
          </button>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
