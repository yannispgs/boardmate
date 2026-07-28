"use client";

import { sectionHeadingClass } from "@/components/ui";

/** One choice of an {@link OptionPicker}. */
export interface PickerOption<T extends string | number> {
  value: T;
  label: string;
  /** Small second line under the label (tile count, target score…). */
  hint?: string;
}

/**
 * How the row is drawn. The two are the same control — one choice at a time out
 * of a handful — dressed for two jobs: `segmented` is the titled, centred pill
 * bar the generators put above a board, `chips` the quieter outlined row a
 * filter panel puts among its other criteria.
 */
export type PickerVariant = "segmented" | "chips";

const STYLE: Record<
  PickerVariant,
  Readonly<{
    root: string;
    label: string;
    list: string;
    option: string;
    active: string;
    idle: string;
    activeHint: string;
  }>
> = {
  segmented: {
    root: "flex flex-col items-center gap-1.5",
    label: sectionHeadingClass,
    list: "flex rounded-lg border border-black/10 p-1 dark:border-white/10",
    option: "rounded-md px-4 py-1.5 font-medium",
    active: "bg-indigo-600 text-white",
    idle: "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5",
    activeHint: "text-white/80",
  },
  chips: {
    root: "flex flex-col gap-2",
    label:
      "text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400",
    list: "flex flex-wrap gap-2",
    option:
      "rounded-full border px-3 py-1 [@media(hover:hover)]:hover:border-indigo-400",
    active:
      "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    idle: "border-black/10 dark:border-white/15",
    activeHint: "text-indigo-500",
  },
};

/**
 * A single-select row of buttons: exactly one option is active at a time.
 * Which game the statistics are about, the board size, the Marins scenario and
 * its player count — the same control throughout, so a choice looks like a
 * choice wherever it is offered.
 *
 * The title is shown, not just announced: a row of names says nothing about
 * what it is a row of. It is optional only where the screen around it already
 * says so.
 */
export function OptionPicker<T extends string | number>({
  variant,
  options,
  value,
  onChange,
  label,
  action,
}: Readonly<{
  variant: PickerVariant;
  options: PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  /** Optional control shown next to the title, e.g. "add one of these". */
  action?: React.ReactNode;
}>) {
  const style = STYLE[variant];

  return (
    <div className={style.root}>
      {label === undefined && action === undefined ? null : (
        <div className="flex items-center gap-2">
          <span className={style.label}>{label}</span>
          {action}
        </div>
      )}

      <div aria-label={label} className={style.list}>
        {options.map(option => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`flex flex-col items-center text-sm transition ${style.option} ${active ? style.active : style.idle}`}
            >
              {option.label}
              {option.hint === undefined ? null : (
                <span
                  className={`text-[11px] ${active ? style.activeHint : "text-zinc-400"}`}
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
