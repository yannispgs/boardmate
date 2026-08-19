import { formatDuration } from "@/lib/game/format-time";
import type { TurnPhaseStat } from "@/lib/game/phase-stats";

/**
 * This player's rhythm in the one phase of a game where turns are taken, read
 * against the table on the same parties.
 *
 * The other phases of such a game are played by everybody at once, so they
 * belong to the table and are shown in the « Jeux » tab, never here: a share of
 * a simultaneous phase would be a measurement nobody took.
 */
export function TurnPhaseCard({ stat }: Readonly<{ stat: TurnPhaseStat }>) {
  const faster = stat.averageS < stat.tableAverageS;
  const gap = Math.abs(stat.averageS - stat.tableAverageS);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-baseline gap-3">
        <span className="flex-1 font-medium">{stat.boardgameName}</span>
        <span className="text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
          {formatDuration(stat.averageS)}
        </span>
      </div>

      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {stat.label}
      </span>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        <span>Table {formatDuration(stat.tableAverageS)}</span>
        <span className={faster ? "text-teal-600 dark:text-teal-400" : ""}>
          {faster ? "▼" : "▲"} {formatDuration(gap)}
        </span>
        <span>
          {stat.turns} tour{stat.turns > 1 ? "s" : ""} sur {stat.games} partie
          {stat.games > 1 ? "s" : ""}
        </span>
      </div>
    </li>
  );
}
