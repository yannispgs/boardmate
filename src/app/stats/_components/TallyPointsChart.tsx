import type { TallyPointsBar } from "@/lib/game/tally-averages";
import type { TallyExitLabels } from "@/lib/game/tally-labels";

const TRACK = 96; // px for the tallest bar
const STUB = 4; // min height so empty values stay visible

/** What one bar stands for: a single cost, or a range of them. */
function tick(bar: TallyPointsBar): string {
  return bar.points === bar.upTo ? String(bar.points) : `${bar.points}+`;
}

/**
 * How much a manche usually costs, over the parties in scope: one bar per
 * possible cost — or per range of them, for a game counting in hundreds — from
 * 0 to the heaviest ever taken. The 0 bar is tinted apart and always stands
 * alone: it is not a small paquet, it is the manche nobody paid for.
 */
export function TallyPointsChart({
  bars,
  labels,
}: Readonly<{ bars: TallyPointsBar[]; labels: TallyExitLabels }>) {
  if (bars.length === 0) {
    return null;
  }

  const maxCount = Math.max(1, ...bars.map(b => b.count));
  const total = bars.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-1">
        {bars.map(bar => (
          <div
            key={bar.points}
            className="flex flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-[10px] text-zinc-400 tabular-nums leading-none">
              {bar.count || ""}
            </span>
            <span
              className={`w-full rounded-t ${
                bar.points === 0 ? "bg-emerald-500" : "bg-indigo-500"
              }`}
              style={{ height: STUB + (bar.count / maxCount) * (TRACK - STUB) }}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-1">
        {bars.map(bar => (
          <span
            key={bar.points}
            className="flex-1 text-center text-[10px] font-medium text-zinc-500 tabular-nums dark:text-zinc-400"
          >
            {tick(bar)}
          </span>
        ))}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {total} manche{total > 1 ? "s" : ""} de joueur · en vert les{" "}
        {labels.events}, en violet ce que les autres ont ramassé.
      </p>
    </div>
  );
}
