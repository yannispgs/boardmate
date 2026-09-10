import { GaugeBar } from "@/components/stats/GaugeBar";
import type { PhaseSpec } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import type { Gauge } from "@/lib/game/party-gauge";
import { phaseColorOf } from "@/lib/game/phase-colors";
import type { PhaseTotal } from "@/lib/game/phase-stats";

/** A phase in the legend, with the bar placing it among past parties if there is one. */
export type PhaseLegendEntry = PhaseTotal & { gauge?: Gauge | null };

/**
 * What each colour stands for, and what it cost. The legend carries the totals
 * rather than leaving them to the bars' tooltips: this is a phone-first app, so
 * a figure only reachable by hovering is a figure nobody at the table ever sees.
 *
 * A `gauge` on an entry adds, under its duration, the level of that phase among
 * the parties before it — so « la production a pris six minutes » becomes « …et
 * c'est la plus longue qu'on ait jouée ». Optional: the same legend serves the
 * statistics page, where the totals are an average of many parties and have
 * nothing of the sort to be read against.
 */
export function PhaseTotalsLegend({
  totals,
  phases,
}: Readonly<{
  totals: readonly PhaseLegendEntry[];
  phases: readonly PhaseSpec[];
}>) {
  return (
    <ul className="flex flex-wrap items-start justify-center gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
      {totals.map(total => (
        <li key={total.key} className="flex min-w-24 flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: phaseColorOf(phases, total.key) }}
            />
            {total.label}
            <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
              {formatDuration(total.totalS)}
            </span>
          </span>
          {total.gauge ? <GaugeBar gauge={total.gauge} /> : null}
        </li>
      ))}
    </ul>
  );
}
