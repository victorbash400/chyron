import { RotateCw, X } from "lucide-react";
import "./ErrorNotice.css";
export default function ErrorNotice({
  error,
  onRetry,
  onDismiss,
}: {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="error-notice" role="alert">
      <span>{error}</span>
      {onRetry && (
        <button aria-label="Retry connection" onClick={onRetry}>
          <RotateCw />
        </button>
      )}
      {onDismiss && (
        <button aria-label="Dismiss error" onClick={onDismiss}>
          <X />
        </button>
      )}
    </div>
  );
}
