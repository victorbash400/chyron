import type { ReactNode } from "react";
import styles from "./SettingsGroup.module.css";
export default function SettingsGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${styles.group} ${className}`}>{children}</div>;
}
