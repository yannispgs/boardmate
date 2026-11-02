"use client";

import { MiniBarChart } from "@/components/stats/MiniBarChart";
import type { PopulatedGame } from "@/lib/domain";
import { DEFAULT_STAGE_LABEL } from "@/lib/game/finished-setup";
import { ladderSeries } from "@/lib/game/ladder";
import type { TallyAverages } from "@/lib/game/tally-averages";
import { computeTallyAverages } from "@/lib/game/tally-averages";
import {
  buildStageTotalsSeries,
  computeTallyStats,
} from "@/lib/game/tally-stats";
import { useGameStats } from "@/lib/hooks/use-game-stats";

import { BetHighlights } from "./BetHighlights";
import { BetPartySection } from "./BetPartySection";
import { PhaseTimeSection } from "./PhaseTimeSection";
import { ScoreChart } from "./ScoreChart";
import { TallyHighlight as Highlight } from "./TallyHighlight";
import { TallyPlayerCardList } from "./TallyPlayerCardList";
import { TallyStatTiles } from "./TallyStatTiles";

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
 * End-of-game statistics for a game counted manche by manche (Odin, Phase 10,
 * Luz).
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
  const stageLabel = game.boardgame.stages?.label ?? DEFAULT_STAGE_LABEL;
  const unit = stageLabel.toLowerCase();
  // Luz: the party's bets — who bet well, and what stands out.
  const bet = game.boardgame.stages?.bet;
  const party = {
    players,
    stageScores: game.stageScores,
    count: game.boardgame.stages?.count ?? stats.stageCount,
  };
  // The laps the table counted, manche by manche (Phase 10).
  const laps = game.phaseTimes.filter(p => p.laps != null);

  // Phase 10: the climb is what decided the game, so it gets its own curve —
  // except in the variant, where everybody climbs in step and the curve would
  // be one line drawn over every other.
  const ladder = game.boardgame.stages?.ladder;
  const climb =
    ladder === undefined || game.ladderFixed === true
      ? null
      : ladderSeries(
          players.map(p => p.playerId),
          game.stageScores,
          ladder.steps.length,
          false,
        );

  return (
    <section className="flex flex-col gap-6">
      <TallyStatTiles
        stageLabel={stageLabel}
        stageCount={stats.stageCount}
        winnerScore={winnerScore}
        avgPointsPerStage={stats.avgPointsPerStage}
        averages={averages}
      />

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        {caption(game.boardgame.name, averages)}
      </p>

      {bet === undefined ? null : <BetHighlights party={party} unit={unit} />}

      {/* What a manche cost is a shedding game's story; on Luz a manche's
          points are a prize, and the drop above is the story instead. */}
      {bet === undefined && stats.worstStage ? (
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

      {climb !== null && ladder !== undefined && stats.stageCount > 0 ? (
        <div data-testid="ladder-chart" className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Avancée des {ladder.label.toLowerCase()}s — manche par manche
          </h3>
          <ScoreChart
            series={climb}
            maxScore={ladder.steps.length}
            threshold={ladder.steps.length}
            rounds={stats.stageCount}
            players={players.map(p => ({ id: p.playerId, name: p.name }))}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Le nombre de {ladder.label.toLowerCase()}s réalisées après chaque
            manche ; la ligne jaune est la dernière, celle qui gagne.
          </p>
        </div>
      ) : null}

      {totals.series.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Évolution des totaux — {unit} par {unit}
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

      <PhaseTimeSection game={game} stageLabel={stageLabel} />

      {laps.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Tours de table — manche par manche
          </h3>
          <MiniBarChart
            testId="stage-laps"
            bars={laps.map(p => ({
              key: String(p.stage),
              label: String(p.stage),
              value: p.laps ?? 0,
              caption: String(p.laps),
            }))}
          />
        </div>
      ) : null}

      {bet === undefined ? null : <BetPartySection bet={bet} party={party} />}

      {bet === undefined && stats.stageCount > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Sorties — du plus souvent sorti au moins souvent
          </h3>
          <TallyPlayerCardList
            players={stats.players}
            stageCount={stats.stageCount}
            winnerIds={winnerIds}
          />
        </div>
      ) : null}
    </section>
  );
}
