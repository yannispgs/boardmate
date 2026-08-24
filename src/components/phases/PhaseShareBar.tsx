import type { PhaseSpec } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import { phaseColorOf } from "@/lib/game/phase-colors";
import type { PhaseTotal } from "@/lib/game/phase-stats";

/**
 * Where the time goes, as one bar: each phase takes the width of its share of
 * everything the phases cost. It answers a different question from the stacked
 * bars above it — those say how a generation grew, this one says what the game
 * is actually made of.
 *
 * A share under a tenth gets no figure written inside it: the text would be
 * wider than the segment and spill over its neighbour.
 */
export function PhaseShareBar({
  totals,
  phases,
}: Readonly<{ totals: readonly PhaseTotal[]; phases: readonly PhaseSpec[] }>) {
  return (
    <div className="flex h-8 overflow-hidden rounded-lg">
      {totals.map(total => (
        <div
          key={total.key}
          title={`${total.label} — ${formatDuration(total.totalS)}`}
          className="flex items-center justify-center text-[0.7rem] font-semibold text-white tabular-nums"
          style={{
            width: `${total.share * 100}%`,
            backgroundColor: phaseColorOf(phases, total.key),
          }}
        >
          {total.share >= 0.1 ? `${Math.round(total.share * 100)} %` : null}
        </div>
      ))}
    </div>
  );
}
