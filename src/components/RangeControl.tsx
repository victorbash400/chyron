import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./RangeControl.css";
export default function RangeControl({
  label,
  value,
  min,
  max,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const submitted = useRef(value);
  useEffect(() => {
    setDraft(value);
    submitted.current = value;
  }, [value]);
  function commit(value: number) {
    if (submitted.current !== value) {
      submitted.current = value;
      onCommit(value);
    }
  }
  return (
    <label className="range-control">
      <span>
        {draft}
        {label === "Size" ? "%" : ""}
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={5}
        value={draft}
        disabled={disabled}
        style={
          {
            "--range-progress": `${((draft - min) / (max - min)) * 100}%`,
          } as CSSProperties
        }
        onChange={(event) => setDraft(event.currentTarget.valueAsNumber)}
        onPointerUp={(event) => commit(event.currentTarget.valueAsNumber)}
        onKeyUp={(event) => commit(event.currentTarget.valueAsNumber)}
        onBlur={(event) => commit(event.currentTarget.valueAsNumber)}
      />
    </label>
  );
}
