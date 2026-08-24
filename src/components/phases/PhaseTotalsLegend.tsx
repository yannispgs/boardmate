import type { PhaseSpec } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import { phaseColorOf } from "@/lib/game/phase-colors";
import type { PhaseTotal } from "@/lib/game/phase-stats";

/**
 * What each colour stands for, and what it cost. The legend carries the totals
 * rather than leaving them to the bars' tooltips: this is a phone-first app, so
 * a figure only reachable by hovering is a figure nobody at the table ever sees.
 */
export function PhaseTotalsLegend({
  totals,
  phases,
}: Readonly<{ totals: readonly PhaseTotal[]; phases: readonly PhaseSpec[] }>) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
      {totals.map(total => (
        <li key={total.key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: phaseColorOf(phases, total.key) }}
          />
          {total.label}
          <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
            {formatDuration(total.totalS)}
          </span>
        </li>
      ))}
    </ul>
  );
}
