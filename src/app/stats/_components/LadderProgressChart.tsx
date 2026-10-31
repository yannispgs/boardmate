import { MiniBarChart } from "@/components/stats/MiniBarChart";
import type { LadderProgressPoint } from "@/lib/game/ladder-stats";

/**
 * How far the table has usually climbed after each manche (Phase 10): one bar
 * per manche, as high as the average number of phases cleared by then, against
 * the top of the ladder.
 */
export function LadderProgressChart({
  points,
  top,
}: Readonly<{ points: readonly LadderProgressPoint[]; top: number }>) {
  return (
    <div className="flex flex-col gap-2">
      <MiniBarChart
        testId="ladder-progress"
        max={top}
        bars={points.map(point => ({
          key: String(point.stage),
          label: String(point.stage),
          value: point.average,
          caption: point.average.toFixed(1),
        }))}
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Sous chaque barre, la manche ; au-dessus, le nombre moyen de phases
        réalisées une fois cette manche jouée (sur {top}). Les dernières manches
        ne comptent que les parties qui ont duré jusque-là.
      </p>
    </div>
  );
}
