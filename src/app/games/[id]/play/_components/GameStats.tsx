import type { PopulatedGame } from "@/lib/domain";

import { formatDuration } from "@/lib/game/format-time";
import { computeGameStats } from "@/lib/game/stats";

import { PlayerStatCardList } from "./PlayerStatCardList";
import { StatTile } from "./StatTile";

/**
 * The end-of-game statistics panel (time & rhythm). Reveals below the winner
 * banner when the player scrolls. All figures are derived client-side from the
 * turn log by `computeGameStats`; nothing here needs the network.
 */
export function GameStats({ game }: { game: PopulatedGame }) {
  const stats = computeGameStats({
    players: game.players,
    turns: game.turns,
    startedAt: game.startedAt,
    endedAt: game.endedAt,
  });

  const dash = (s: number | null) => (s === null ? "—" : formatDuration(s));

  const tiles: { label: string; value: string; accent?: boolean }[] = [
    { label: "Durée réelle", value: dash(stats.realDurationS), accent: true },
    { label: "Temps de jeu", value: formatDuration(stats.activeTotalS) },
    { label: "Hors-tour", value: dash(stats.offTurnS) },
    { label: "Manches", value: String(stats.rounds) },
    { label: "Tours", value: String(stats.turnCount) },
    { label: "Tour moyen", value: formatDuration(stats.avgTurnS) },
  ];

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-center text-lg font-semibold">
        Statistiques de la partie
      </h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map(t => (
          <StatTile
            key={t.label}
            label={t.label}
            value={t.value}
            accent={t.accent}
          />
        ))}
      </div>

      {stats.longestTurn ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
          <span className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span aria-hidden>⏳</span>
            Tour le plus long
          </span>
          <span className="text-sm tabular-nums">
            <span className="font-semibold">
              {formatDuration(stats.longestTurn.durationS)}
            </span>{" "}
            <span className="text-zinc-500 dark:text-zinc-400">
              · {stats.longestTurn.name}, manche {stats.longestTurn.round}
            </span>
          </span>
        </div>
      ) : null}

      {stats.turnCount > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Répartition du temps — du plus rapide au plus lent
          </h3>
          <PlayerStatCardList
            players={stats.players}
            scaleS={stats.longestTurn?.durationS ?? 0}
          />
        </div>
      ) : null}
    </section>
  );
}
