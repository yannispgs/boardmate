import { formatDuration } from "@/lib/game/format-time";
import type { PlayerAggregate } from "@/lib/game/global-stats";

function Cell({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * One player's line within a single game's stats: their record on THIS game
 * only (win rate, games, wins, mean score), followed by whatever the game
 * actually measures about the person — the time figures when it times each
 * player, the manches they sat through and the ones they closed when it counts
 * manches, and nothing at all when it does neither (a simultaneous game plays
 * as one table, so no share of its time belongs to anybody).
 */
export function GamePlayerRow({
  rank,
  player,
  scored,
  timed,
  tally,
  exitLabel,
}: Readonly<{
  rank: number;
  player: PlayerAggregate;
  scored: boolean;
  /** Whether this game attributes the time it records to a single player. */
  timed: boolean;
  /** This player's manches, or null for a game that counts turns instead. */
  tally: { stages: number; exits: number } | null;
  /** What this game calls a manche taken at 0 (« Sorties », « Manches à 0 »). */
  exitLabel: string;
}>) {
  const medal = MEDALS[rank - 1] ?? `${rank}.`;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
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

      <div className="grid grid-cols-3 gap-2">
        <Cell label="Parties" value={String(player.games)} />
        <Cell label="Victoires" value={String(player.wins)} />
        {scored ? (
          <Cell
            label="Score moy."
            value={player.avgScore === null ? "—" : player.avgScore.toFixed(1)}
          />
        ) : null}
        {tally ? (
          <>
            <Cell label="Manches" value={String(tally.stages)} />
            <Cell label={exitLabel} value={String(tally.exits)} />
          </>
        ) : null}
        {timed ? (
          <>
            <Cell label="Tour moy." value={formatDuration(player.avgTurnS)} />
            <Cell
              label="Part du temps"
              value={
                player.timeIndex === null
                  ? "—"
                  : String(Math.round(player.timeIndex))
              }
            />
          </>
        ) : null}
      </div>
    </li>
  );
}
