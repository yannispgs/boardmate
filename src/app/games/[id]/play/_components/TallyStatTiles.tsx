import { StatTile } from "@/components/StatTile";
import { statDelta } from "@/lib/game/stat-delta";
import type { TallyAverages } from "@/lib/game/tally-averages";

/**
 * The three headline figures of a game counted manche by manche, each read
 * against the same game's earlier parties when there are any.
 */
export function TallyStatTiles({
  stageLabel,
  stageCount,
  winnerScore,
  avgPointsPerStage,
  averages,
}: Readonly<{
  stageLabel: string;
  stageCount: number;
  winnerScore: number | null;
  avgPointsPerStage: number | null;
  averages: TallyAverages | null;
}>) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <StatTile
        label={`${stageLabel}s`}
        value={String(stageCount)}
        accent
        delta={statDelta(stageCount, averages?.avgStages ?? null)}
      />
      <StatTile
        label="Score du vainqueur"
        value={winnerScore === null ? "—" : String(winnerScore)}
        delta={
          winnerScore === null
            ? null
            : statDelta(winnerScore, averages?.avgWinnerScore ?? null)
        }
      />
      <StatTile
        label={`Points / ${stageLabel.toLowerCase()}`}
        value={avgPointsPerStage === null ? "—" : avgPointsPerStage.toFixed(1)}
        delta={
          avgPointsPerStage === null
            ? null
            : statDelta(avgPointsPerStage, averages?.avgPointsPerStage ?? null)
        }
      />
    </div>
  );
}
