import LoadingSpinner from "./LoadingSpinner";
import styles from "./LoadingRegion.module.css";

export default function LoadingRegion({
  label = "Loading",
  overlay = false,
  compact = false,
}: {
  label?: string;
  overlay?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={styles.region}
      data-overlay={overlay || undefined}
      data-compact={compact || undefined}
      aria-busy="true"
    >
      <LoadingSpinner size={compact ? 20 : 24} label={label} />
    </div>
  );
}
