import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./SettingsMenu.module.css";

export default function SettingsMenu({
  label,
  anchor,
  x,
  y,
  entries,
  onClose,
}: {
  label: string;
  anchor: HTMLButtonElement | null;
  x: number;
  y: number;
  entries: { label: string; selected: boolean; action: () => void }[];
  onClose: (restoreFocus?: boolean) => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const rect = menu.current!.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)),
    });
    const selected = menu.current?.querySelector<HTMLButtonElement>(
      'button[aria-checked="true"]',
    );
    (
      selected ?? menu.current?.querySelector<HTMLButtonElement>("button")
    )?.focus();
    const dismiss = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !anchor?.contains(event.target as Node)
      )
        close.current();
    };
    const resize = () => close.current(true);
    const scroll = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) close.current();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", resize);
    };
  }, [x, y, anchor]);
  return createPortal(
    <div
      ref={menu}
      className={styles.menu}
      style={position}
      role="menu"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Tab") {
          event.stopPropagation();
          if (event.key === "Escape") event.preventDefault();
          onClose(true);
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const buttons = Array.from(
            menu.current!.querySelectorAll<HTMLButtonElement>("button"),
          );
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    buttons.length) %
                  buttons.length;
          buttons[next]?.focus();
        }
      }}
    >
      {entries.map((entry) => (
        <button
          key={entry.label}
          type="button"
          role="menuitemradio"
          aria-checked={entry.selected}
          onClick={() => {
            onClose(true);
            entry.action();
          }}
        >
          {entry.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
