import styles from "./LoadingSpinner.module.css";

export default function LoadingSpinner({
  size = 22,
  label = "Loading",
}: {
  size?: number;
  label?: string;
}) {
  return (
    <span
      className={styles.spinner}
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
    />
  );
}
