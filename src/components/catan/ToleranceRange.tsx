"use client";

import type { ReactNode } from "react";

/** The widest margin the slider offers, in percent. */
const MAX_TOLERANCE_PCT = 60;

/**
 * The ±% a resource's production may stray from its expected share — the same
 * slider whether it holds the whole board in balance or one zone of it, since
 * it is the same reading taken over fewer tiles.
 */
export function ToleranceRange({
  label,
  value,
  onChange,
  hint,
}: Readonly<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: ReactNode;
}>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>
        {label} : ±{value} %
      </span>
      <input
        type="range"
        min={0}
        max={MAX_TOLERANCE_PCT}
        step={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={`${label} en pourcentage`}
        className="accent-indigo-600"
      />
      {hint === undefined ? null : (
        <span className="text-[11px] text-zinc-400">{hint}</span>
      )}
    </label>
  );
}
