import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import SettingsMenu from "./SettingsMenu.tsx";
import styles from "./SettingsPicker.module.css";

export default function SettingsPicker<T extends string | number>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const selected = options.find((option) => option.value === value)?.label;
  function close(restoreFocus = false) {
    setPosition(null);
    if (restoreFocus) trigger.current?.focus();
  }
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.button}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(position) && !disabled}
        title={selected}
        disabled={disabled}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition(position ? null : { x: rect.left, y: rect.bottom + 6 });
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            setPosition({ x: rect.left, y: rect.bottom + 6 });
          }
        }}
      >
        <span>{selected}</span>
        <ChevronDown size={14} />
      </button>
      {position && !disabled && (
        <SettingsMenu
          label={label}
          anchor={trigger.current}
          {...position}
          onClose={close}
          entries={options.map((option) => ({
            label: option.label,
            selected: option.value === value,
            action: () => {
              if (option.value !== value) onChange(option.value);
            },
          }))}
        />
      )}
    </>
  );
}
