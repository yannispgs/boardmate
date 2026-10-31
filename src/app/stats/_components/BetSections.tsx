import { StatTile } from "@/components/StatTile";
import { percent } from "@/components/stats/BetPlayerCard";
import { BetPlayerCardList } from "@/components/stats/BetPlayerCardList";
import { MiniBarChart } from "@/components/stats/MiniBarChart";
import type { BetPayoff, BetStats } from "@/lib/game/bet-stats";

import { HedgeByStageTable } from "./HedgeByStageTable";
import { StatsSection } from "./StatsSection";

/** « 60 % · 8.3 pts » — what a set of bets came to, or « — » with none. */
function payoffLine(payoff: BetPayoff): string {
  if (payoff.successRate === null || payoff.avgPoints === null) {
    return "—";
  }

  return `${percent(payoff.successRate)} · ${payoff.avgPoints.toFixed(1)} pts`;
}

/**
 * What a game played on bets (Luz) has to show over several parties: who bets
 * well, what the safety token is worth, which donne goes wrong most, and who
 * reaches for the token when.
 */
export function BetSections({
  stats,
  stageLabel,
  hedgeLabel,
}: Readonly<{
  stats: BetStats;
  /** What a manche is called (« Donne »). */
  stageLabel: string;
  /** What the hedge is called (« Jeton Sécurité »). */
  hedgeLabel: string;
}>) {
  if (stats.players.length === 0) {
    return null;
  }

  const hedge = hedgeLabel.toLowerCase();
  const unit = stageLabel.toLowerCase();

  return (
    <>
      <StatsSection title="Paris réussis">
        <BetPlayerCardList stats={stats.players} hedgeLabel={hedgeLabel} />
      </StatsSection>

      <StatsSection title={`Ce que rapporte le ${hedge}`}>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label={`Avec ${hedge}`} value={payoffLine(stats.hedged)} />
          <StatTile
            label={`Sans ${hedge}`}
            value={payoffLine(stats.unhedged)}
          />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Taux de paris réussis et points moyens par {unit}, selon que le{" "}
          {hedge} a été pris ou non.
        </p>
      </StatsSection>

      <StatsSection title={`Réussite ${unit} par ${unit}`}>
        <MiniBarChart
          testId="bet-success-by-stage"
          max={1}
          bars={stats.byStage.map(stage => ({
            key: String(stage.stage),
            label: String(stage.stage),
            value: stage.successRate ?? 0,
            caption:
              stage.successRate === null ? "—" : percent(stage.successRate),
          }))}
        />
      </StatsSection>

      <StatsSection title={`Prise du ${hedge} ${unit} par ${unit}`}>
        <HedgeByStageTable players={stats.players} stageLabel={stageLabel} />
      </StatsSection>
    </>
  );
}
