import { useLayoutEffect, useRef, useState } from "react";

export function useTickerLoop(still: boolean, hasItems: boolean) {
  const viewport = useRef<HTMLDivElement>(null);
  const sample = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ width: 0, copies: 2 });
  useLayoutEffect(() => {
    if (still || !hasItems || !viewport.current || !sample.current) return;
    const measure = () => {
      const width = sample.current?.offsetWidth ?? 0;
      if (!width) return;
      const copies = Math.max(
        2,
        Math.ceil((viewport.current?.clientWidth ?? 0) / width) + 1,
      );
      setLayout((previous) =>
        previous.width === width && previous.copies === copies
          ? previous
          : { width, copies },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current);
    observer.observe(sample.current);
    return () => observer.disconnect();
  }, [still, hasItems]);
  return { viewport, sample, ...layout };
}
