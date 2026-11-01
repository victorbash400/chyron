import styles from "./ToggleSwitch.module.css";

export default function ToggleSwitch({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  disabled?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      role="switch"
      aria-label={label}
      aria-checked={checked}
      title={label}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
