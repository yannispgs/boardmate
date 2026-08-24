import { PhaseShareBar } from "@/components/phases/PhaseShareBar";
import { PhaseStageChart } from "@/components/phases/PhaseStageChart";
import { PhaseTotalsLegend } from "@/components/phases/PhaseTotalsLegend";
import type { PopulatedGame } from "@/lib/domain";
import { phaseTotals, stageBreakdowns } from "@/lib/game/phase-stats";

/**
 * « Temps par phase » in the end-of-game recap: how each generation was spent,
 * then what the party as a whole was made of.
 *
 * Renders nothing for the games that declare no phase — which is every game but
 * two — and nothing either while no phase has been closed yet.
 */
export function PhaseTimeSection({
  game,
  stageLabel,
}: Readonly<{ game: PopulatedGame; stageLabel: string }>) {
  const phases = game.boardgame.phases;
  const stages = stageBreakdowns(game.phaseTimes, phases);

  if (!phases || stages.length === 0) {
    return null;
  }

  const totals = phaseTotals(game.phaseTimes, phases);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Temps par phase — {stageLabel.toLowerCase()} par{" "}
        {stageLabel.toLowerCase()}
      </h3>

      <PhaseStageChart
        stages={stages}
        phases={phases}
        stageLabel={stageLabel}
      />

      <div className="flex flex-col gap-2 pt-1">
        <PhaseShareBar totals={totals} phases={phases} />
        <PhaseTotalsLegend totals={totals} phases={phases} />
      </div>
    </div>
  );
}
