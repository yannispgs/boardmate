"use client";

const headingClass = "flex items-center gap-2 font-medium";

/**
 * The score to reach, kept in view at the bottom of the recap while the rest of
 * the setup scrolls — it's the number the whole configuration aims at, so it
 * shouldn't be the one thing you have to scroll back up for.
 *
 * A scenario imposes its target, and the bar then only reads it out; otherwise
 * the number belongs to the game and stays editable for this game alone. An
 * option that raises the target (Catan's « Maître du port ») is spelled out
 * underneath, because the field holds the base while the raised total is what
 * will actually be played.
 */
export function WinTargetBar({
  locked,
  note,
  value,
  min,
  max,
  bonus,
  onChange,
}: Readonly<{
  /** The target a scenario imposes, or `null` when the game sets its own. */
  locked: number | null;
  /** Why the target is imposed — shown only alongside a locked target. */
  note?: string;
  /** The editable target, empty while the field is being cleared. */
  value: number | "";
  min?: number;
  max?: number;
  /** What options add on top of an editable target, already summed. */
  bonus: { label: string; total: number } | null;
  onChange: (value: number | undefined) => void;
}>) {
  const heading = (
    <>
      <span aria-hidden>🎯</span>
      <span>Score à atteindre pour gagner</span>
    </>
  );

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-indigo-500/40 bg-indigo-500/[0.06] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        {locked === null ? (
          <label htmlFor="win-threshold" className={headingClass}>
            {heading}
          </label>
        ) : (
          <span className={headingClass}>{heading}</span>
        )}

        {locked === null ? (
          <input
            id="win-threshold"
            type="number"
            inputMode="numeric"
            step={1}
            min={min}
            max={max}
            value={value}
            onChange={e =>
              onChange(
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
            className="w-20 shrink-0 rounded-lg border border-black/15 bg-white px-3 py-2 text-lg font-semibold tabular-nums outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
          />
        ) : (
          <span className="shrink-0 text-lg font-semibold tabular-nums">
            {locked}
          </span>
        )}
      </div>

      {locked !== null && note ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{note}</p>
      ) : null}
      {locked === null && bonus ? (
        <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
          {bonus.label}
          {" → "}
          <strong>{bonus.total}</strong>&nbsp;points à atteindre
        </p>
      ) : null}
    </div>
  );
}
