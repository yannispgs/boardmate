"use client";

import { sectionHeadingClass } from "@/components/ui";

/** One choice of a {@link SegmentedPicker}. */
export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  /** Small second line under the label (tile count, target score…). */
  hint?: string;
}

/**
 * The generators' pill selector: a titled row of mutually-exclusive buttons,
 * the active one filled indigo. Used for the board size, the Marins scenario
 * and its player count. The title is shown, not just announced — a row of
 * names says nothing about what it is a row of.
 */
export function SegmentedPicker<T extends string | number>({
  options,
  value,
  onChange,
  label,
  action,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** Optional control shown next to the title, e.g. "add one of these". */
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <span className={sectionHeadingClass}>{label}</span>
        {action}
      </div>

      <div
        aria-label={label}
        className="flex rounded-lg border border-black/10 p-1 dark:border-white/10"
      >
        {options.map(option => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`flex flex-col items-center rounded-md px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5"
              }`}
            >
              {option.label}
              {option.hint === undefined ? null : (
                <span
                  className={`text-[11px] ${active ? "text-white/80" : "text-zinc-400"}`}
                >
                  {option.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
