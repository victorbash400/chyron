import type { AnchorHTMLAttributes } from "react";
import styles from "./IconButton.module.css";

export default function IconLink({
  label,
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { label: string }) {
  return (
    <a
      className={`${styles.button} ${className}`}
      aria-label={label}
      {...props}
    />
  );
}
