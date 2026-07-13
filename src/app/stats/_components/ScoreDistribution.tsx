import type { ScoreHistogram } from "@/lib/game/score-distribution";

const TRACK = 96; // px for the tallest bar
const STUB = 4; // min height so empty buckets stay visible

/**
 * Histogram of the final scores collected over a game's parties: one bar per
 * bucket, height ∝ how many scores fell in it. The x labels are each bucket's
 * lower bound (buckets are `step` wide), and a footer gives the count, range
 * and mean. Shows how spread out — or clustered — a game's scores tend to be.
 */
export function ScoreDistribution({
  histogram,
}: {
  histogram: ScoreHistogram;
}) {
  const maxCount = Math.max(1, ...histogram.bins.map(b => b.count));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-1">
        {histogram.bins.map(bin => {
          const height = STUB + (bin.count / maxCount) * (TRACK - STUB);

          return (
            <div
              key={bin.start}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[10px] text-zinc-400 tabular-nums leading-none">
                {bin.count || ""}
              </span>
              <span
                className="w-full rounded-t bg-indigo-500"
                style={{ height }}
              />
              <span className="text-[10px] font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                {bin.start}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {histogram.count} score{histogram.count > 1 ? "s" : ""} · de{" "}
        {histogram.min} à {histogram.max} · moyenne {histogram.mean.toFixed(1)}
        {histogram.step > 1 ? ` · tranches de ${histogram.step}` : ""}
      </p>
    </div>
  );
}
