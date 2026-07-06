import type { DiceDeviation, DiceLuck } from "@/lib/game/dice";

const LUCK_CLASS: Record<DiceLuck, string> = {
  over: "text-emerald-600 dark:text-emerald-400",
  under: "text-red-600 dark:text-red-400",
  even: "text-zinc-400",
};

/** Signed écart with a real minus sign, one decimal (e.g. `+2.5`, `−1.0`). */
function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "−";

  return `${sign}${Math.abs(delta).toFixed(1)}`;
}

/**
 * Per-combination luck: how each value's observed count compares to what its
 * probability predicts over the same number of rolls. The écart (observed −
 * expected) is green when a number came up more than the odds, red when less,
 * and grey when it's within ±10% of expectation.
 */
export function DiceDeviations({ rows }: { rows: DiceDeviation[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {rows.map(row => (
        <li
          key={row.value}
          className="flex flex-col items-center gap-0.5 rounded-xl border border-black/10 bg-black/[0.02] p-2 dark:border-white/10 dark:bg-white/[0.02]"
        >
          <span className="text-base font-semibold tabular-nums">
            {row.value}
          </span>
          <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {row.count}×
          </span>
          <span
            className={`text-sm font-medium tabular-nums ${LUCK_CLASS[row.luck]}`}
          >
            {formatDelta(row.delta)}
          </span>
        </li>
      ))}
    </ul>
  );
}
