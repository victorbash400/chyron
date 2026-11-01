import type { ReactNode } from "react";
import styles from "./SettingsRow.module.css";
export default function SettingsRow({
  label,
  children,
  compact = false,
}: {
  label: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.row} data-compact={compact || undefined}>
      <span className={styles.label}>{label}</span>
      <div className={styles.value}>{children}</div>
    </div>
  );
}
