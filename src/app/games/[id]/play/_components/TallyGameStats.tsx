"use client";

import type { ReactNode } from "react";

import { StatTile } from "@/components/StatTile";
import type { PopulatedGame } from "@/lib/domain";
import { statDelta } from "@/lib/game/stat-delta";
import type { TallyAverages } from "@/lib/game/tally-averages";
import { computeTallyAverages } from "@/lib/game/tally-averages";
import { tallyExitLabels } from "@/lib/game/tally-labels";
import {
  buildStageTotalsSeries,
  computeTallyStats,
} from "@/lib/game/tally-stats";
import { useGameStats } from "@/lib/hooks/use-game-stats";

import { ScoreChart } from "./ScoreChart";
import { TallyPlayerCardList } from "./TallyPlayerCardList";

/**
 * What the figures above are being compared to — the plural falls on the noun
 * and on the participle alike, so both read from the same count.
 */
function caption(name: string, averages: TallyAverages | null): string {
  if (averages === null) {
    return `Première partie de ${name} — rien à quoi la comparer pour l'instant.`;
  }

  const s = averages.games > 1 ? "s" : "";

  return `Comparé à ${averages.games} partie${s} de ${name} déjà jouée${s}.`;
}

/**
 * End-of-game statistics for a game counted manche by manche (Odin).
 *
 * Nothing is timed in such a game — no turn is ever recorded — so there is no
 * play time, no average turn and no rhythm to show; the manches themselves are
 * the whole story. Each figure is also read against the parties of the same
 * game already played, which is where a number like « 9 manches » stops being
 * trivia and starts saying something.
 */
export function TallyGameStats({ game }: Readonly<{ game: PopulatedGame }>) {
  const { records } = useGameStats();

  const players = game.players.map(p => ({
    playerId: p.playerId,
    name: p.player.name,
  }));
  const winnerIds = game.players.filter(p => p.isWinner).map(p => p.playerId);
  const winnerScore = game.players.find(p => p.isWinner)?.score ?? null;

  const stats = computeTallyStats({
    players,
    scores: game.stageScores,
    target: game.winThreshold,
  });

  // The parties to compare against: the same game, this one left out — a party
  // is not a reference for itself.
  const averages = computeTallyAverages(
    records.filter(
      r => r.boardgameId === game.boardgameId && r.gameId !== game.id,
    ),
  );

  const totals = buildStageTotalsSeries(players, game.stageScores);
  const labels = tallyExitLabels(game.boardgame.stages);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-center text-lg font-semibold">
        Statistiques de la partie
      </h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatTile
          label="Manches"
          value={String(stats.stageCount)}
          accent
          delta={statDelta(stats.stageCount, averages?.avgStages ?? null)}
        />
        <StatTile
          label="Score du vainqueur"
          value={winnerScore === null ? "—" : String(winnerScore)}
          delta={
            winnerScore === null
              ? null
              : statDelta(winnerScore, averages?.avgWinnerScore ?? null)
          }
        />
        <StatTile
          label="Points / manche"
          value={
            stats.avgPointsPerStage === null
              ? "—"
              : stats.avgPointsPerStage.toFixed(1)
          }
          delta={
            stats.avgPointsPerStage === null
              ? null
              : statDelta(
                  stats.avgPointsPerStage,
                  averages?.avgPointsPerStage ?? null,
                )
          }
        />
      </div>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        {caption(game.boardgame.name, averages)}
      </p>

      {stats.worstStage ? (
        <Highlight emoji="🪨">
          <span className="font-semibold">{stats.worstStage.name}</span> a
          ramassé {stats.worstStage.points} points d&apos;un coup à la manche{" "}
          {stats.worstStage.stage} — la plus lourde de la partie.
        </Highlight>
      ) : null}

      {stats.fatalStage ? (
        <Highlight emoji="🛑">
          La manche {stats.fatalStage.stage} a arrêté la partie :{" "}
          <span className="font-semibold">
            {stats.fatalStage.names.join(", ")}
          </span>{" "}
          a franchi les {game.winThreshold} points.
        </Highlight>
      ) : null}

      {totals.series.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Évolution des totaux — manche par manche
          </h3>
          <ScoreChart
            series={totals.series}
            maxScore={totals.maxScore}
            threshold={game.winThreshold}
            rounds={stats.stageCount}
            players={players.map(p => ({ id: p.playerId, name: p.name }))}
          />
          {game.winThreshold === null ? null : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              La ligne jaune est le score à ne pas atteindre : la partie
              s&apos;y arrête, et c&apos;est le plus petit total qui gagne.
            </p>
          )}
        </div>
      ) : null}

      {stats.stageCount > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {labels.heading}
          </h3>
          <TallyPlayerCardList
            players={stats.players}
            labels={labels}
            stageCount={stats.stageCount}
            winnerIds={winnerIds}
          />
        </div>
      ) : null}
    </section>
  );
}

/** A one-line fact worth pulling out of the numbers above. */
function Highlight({
  emoji,
  children,
}: Readonly<{ emoji: string; children: ReactNode }>) {
  return (
    <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-sm">
      <span aria-hidden>{emoji}</span>
      <span>{children}</span>
    </p>
  );
}
