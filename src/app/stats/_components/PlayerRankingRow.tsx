import type { PlayerAggregate } from "@/lib/game/global-stats";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * One player's line in the leaderboard: rank + name, win rate + bar, and a lean
 * games/wins line. The whole row is a button — tapping it opens that player's
 * detailed stats (where the per-game highlights live).
 */
export function PlayerRankingRow({
  rank,
  player,
  onSelect,
}: {
  rank: number;
  player: PlayerAggregate;
  onSelect: () => void;
}) {
  const medal = MEDALS[rank - 1] ?? `${rank}.`;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full flex-col gap-2 rounded-xl border border-black/10 bg-white p-4 text-left transition [@media(hover:hover)]:hover:border-indigo-400 dark:border-white/10 dark:bg-zinc-900"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 text-center text-lg tabular-nums" aria-hidden>
            {medal}
          </span>
          <span className="flex-1 font-medium">{player.name}</span>
          <span className="text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
            {Math.round(player.winRate)}%
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-indigo-500"
            style={{ width: `${player.winRate}%` }}
          />
        </div>

        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {player.games} partie{player.games > 1 ? "s" : ""} · {player.wins}{" "}
          victoire{player.wins > 1 ? "s" : ""}
        </p>
      </button>
    </li>
  );
}
