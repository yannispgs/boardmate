import { formatDuration } from "@/lib/game/format-time";
import type { PhaseTotal } from "@/lib/game/phase-stats";

/**
 * One phase of the selected game, over the parties in scope: what it costs on
 * an average party, on an average stage, and its share of the whole.
 *
 * The colour dot is the same one the phase wears on the bar above and in the
 * end-of-game recap, so the two read as one picture.
 */
export function PhaseTimeCard({
  total,
  color,
  stageLabel,
}: Readonly<{
  total: PhaseTotal;
  color: string;
  /** What this game calls a stage — « Génération », « Manche ». */
  stageLabel: string;
}>) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
      <span
        aria-hidden
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{total.label}</span>
        <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {formatDuration(total.averageS)} par {stageLabel.toLowerCase()} ·{" "}
          {total.stages} {stageLabel.toLowerCase()}
          {total.stages > 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-end">
        <span className="font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
          {formatDuration(total.perGameS)}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          par partie
        </span>
      </div>
    </li>
  );
}
