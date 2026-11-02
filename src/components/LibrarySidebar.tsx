import { useEffect, useRef, type ReactNode } from "react";
import { PanelLeftClose } from "lucide-react";
import { useNarrowLayout } from "../state/useNarrowLayout.ts";
import IconButton from "./controls/IconButton.tsx";
import ChyronBrand from "./ChyronBrand.tsx";
import styles from "./LibrarySidebar.module.css";

export default function LibrarySidebar({
  children,
  open,
  onClose,
}: {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
}) {
  const narrow = useNarrowLayout();
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!narrow || !open) return;
    const previous = document.activeElement;
    sidebar.current?.querySelector("button")?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [narrow, open]);
  return (
    <>
      {narrow && open && (
        <button
          className={styles.backdrop}
          aria-label="Close styles"
          onClick={onClose}
        />
      )}
      <aside
        ref={sidebar}
        className={`${styles.sidebar} ${open ? styles.open : ""}`}
        inert={narrow && !open}
        aria-label="Styles"
        onKeyDown={(event) => {
          if (!narrow || !open) return;
          if (event.key === "Escape") onClose();
          if (event.key !== "Tab") return;
          const controls = Array.from(
            sidebar.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),a[href]",
            ) ?? [],
          );
          const first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className={styles.brand}>
          <ChyronBrand />
          <div className={styles.close}>
            <IconButton label="Close styles" onClick={onClose}>
              <PanelLeftClose />
            </IconButton>
          </div>
        </div>
        <div className={styles.panel}>{children}</div>
      </aside>
    </>
  );
}
