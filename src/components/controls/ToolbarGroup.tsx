import type { ReactNode } from "react";
import styles from "./ToolbarGroup.module.css";
export default function ToolbarGroup({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`${styles.group} ${className}`}
    >
      {children}
    </div>
  );
}
