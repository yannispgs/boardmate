import type { PopulatedGame } from "@/lib/domain";

import { formatDuration } from "@/lib/game/format-time";
import { buildScoreSeries } from "@/lib/game/score-series";
import { computeGameStats } from "@/lib/game/stats";

import { PlayerStatCardList } from "./PlayerStatCardList";
import { ScoreChart } from "./ScoreChart";
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
  });

  const scorePlayers = game.players.map(p => ({
    id: p.playerId,
    name: p.player.name,
  }));
  const scoreCurve = buildScoreSeries(
    game.scoreEvents,
    scorePlayers.map(p => p.id),
    stats.rounds,
  );

  const tiles: { label: string; value: string; accent?: boolean }[] = [
    {
      label: "Temps de jeu",
      value: formatDuration(stats.activeTotalS),
      accent: true,
    },
    { label: "Tours", value: String(stats.rounds) },
    { label: "Tour moyen", value: formatDuration(stats.avgRoundS) },
  ];

  // Pauses only earn their tiles when there were any; otherwise a discreet line.
  if (stats.totalPauseCount > 0) {
    tiles.push(
      { label: "Pauses", value: String(stats.totalPauseCount) },
      { label: "Temps en pause", value: formatDuration(stats.totalPauseS) },
    );
  }

  // Overtime tile only when someone ran over the allotted time.
  if (stats.totalOvertimeS > 0) {
    tiles.push({
      label: "Dépassement",
      value: formatDuration(stats.totalOvertimeS),
    });
  }

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
              · {stats.longestTurn.name}, tour {stats.longestTurn.round}
            </span>
          </span>
        </div>
      ) : null}

      {stats.mostPaused ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
          <span className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span aria-hidden>⏸️</span>
            Le plus en pause
          </span>
          <span className="text-sm tabular-nums">
            <span className="font-semibold">
              {formatDuration(stats.mostPaused.durationS)}
            </span>{" "}
            <span className="text-zinc-500 dark:text-zinc-400">
              · {stats.mostPaused.name} ({stats.mostPaused.count} pause
              {stats.mostPaused.count > 1 ? "s" : ""})
            </span>
          </span>
        </div>
      ) : null}

      {stats.mostOvertime ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3">
          <span className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span aria-hidden>⏱️</span>
            Le plus en dépassement
          </span>
          <span className="text-sm tabular-nums">
            <span className="font-semibold text-red-600 dark:text-red-400">
              {formatDuration(stats.mostOvertime.overtimeS)}
            </span>{" "}
            <span className="text-zinc-500 dark:text-zinc-400">
              · {stats.mostOvertime.name}
            </span>
          </span>
        </div>
      ) : null}

      {stats.turnCount > 0 && stats.totalPauseCount === 0 ? (
        <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
          Aucune pause durant la partie.
        </p>
      ) : null}

      {game.scoreEvents.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Évolution du score
          </h3>
          <ScoreChart
            series={scoreCurve.series}
            maxScore={scoreCurve.maxScore}
            threshold={game.winThreshold}
            rounds={stats.rounds}
            players={scorePlayers}
          />
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
