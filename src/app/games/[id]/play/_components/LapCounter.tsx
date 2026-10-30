import { ErrorText } from "@/components/ErrorText";

import type { StageLaps } from "./use-stage-laps";

/**
 * « Tour 3 » and the button the dealer taps each time the deal comes back to
 * him — the laps of the manche, for the stats. A mistaken tap is taken back
 * with the small « − ».
 */
export function LapCounter({
  laps,
  disabled,
}: Readonly<{ laps: StageLaps; disabled: boolean }>) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          data-testid="lap-count"
          className="flex-1 text-sm font-medium tabular-nums"
        >
          Tour {laps.lap}
        </span>
        <button
          type="button"
          aria-label="Retirer un tour"
          disabled={disabled || laps.busy || laps.lap <= 1}
          onClick={() => laps.step(-1)}
          className="h-9 w-9 rounded-full border border-black/10 text-lg leading-none transition hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/5"
        >
          −
        </button>
        <button
          type="button"
          disabled={disabled || laps.busy}
          onClick={() => laps.step(1)}
          className="rounded-lg border border-indigo-500 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-500/10 disabled:opacity-60 dark:text-indigo-400"
        >
          Tour suivant
        </button>
      </div>
      <ErrorText message={laps.error} />
    </div>
  );
}
