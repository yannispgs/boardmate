"use client";

/**
 * Closes a phase the table plays all at once.
 *
 * Such a phase has no « tour suivant » to press — nobody is up — so without a
 * button of its own the stopwatch would run until somebody happened to think of
 * it. What comes next is named under the button: a table that can read where it
 * is about to land presses with far less hesitation.
 */
export function PhaseControls({
  nextLabel,
  disabled,
  onEndPhase,
}: Readonly<{
  /** What the phase gives way to — the next phase, or the next generation. */
  nextLabel: string;
  disabled: boolean;
  onEndPhase: () => void;
}>) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      <button
        type="button"
        onClick={onEndPhase}
        disabled={disabled}
        className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
      >
        Phase terminée →
      </button>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Ensuite : {nextLabel}
      </p>
    </div>
  );
}
