import type { PopulatedGame } from "@/lib/domain";
import { DEFAULT_STAGE_LABEL } from "@/lib/game/finished-setup";
import { turnPhase } from "@/lib/game/phase-stats";
import { buildScoreSeries } from "@/lib/game/score-series";
import { computeGameStats } from "@/lib/game/stats";
import { hasPlayStats } from "@/lib/game/turn-time";
import { buildTurnTimeSeries } from "@/lib/game/turn-time-series";
import { DiceTimeline } from "./DiceTimeline";
import { GameHighlights } from "./GameHighlights";
import { PartyStatTiles } from "./PartyStatTiles";
import { PhaseTimeSection } from "./PhaseTimeSection";
import { PlayerStatCardList } from "./PlayerStatCardList";
import { ScoreChart } from "./ScoreChart";
import { ScorePaceStats } from "./ScorePaceStats";
import { SimultaneousGameStats } from "./SimultaneousGameStats";
import { TallyGameStats } from "./TallyGameStats";
import { TurnTimeChart } from "./TurnTimeChart";

/**
 * The end-of-game statistics panel (time & rhythm). Reveals below the winner
 * banner when the player scrolls. Everything below the tiles is derived
 * client-side from this party's own turn log by `computeGameStats`; only the
 * tiles look further, at the parties before this one.
 */
export function GameStats({ game }: Readonly<{ game: PopulatedGame }>) {
  // Nothing was timed and nothing was counted in manches (Papayoo): the party
  // left no trace but its scores, which the sheet already holds.
  if (!hasPlayStats(game.boardgame)) {
    return null;
  }

  // A game counted manche by manche (Odin) records no turn at all: every figure
  // below would be a zero. Its manches are the summary.
  if (game.boardgame.stages?.advance === "manual") {
    return <TallyGameStats game={game} />;
  }

  // Simultaneous games have no per-player turns — a different summary applies.
  if (game.boardgame.turnMode === "simultaneous") {
    return <SimultaneousGameStats game={game} />;
  }

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
  const timeCurve = buildTurnTimeSeries(
    game.turns,
    scorePlayers.map(p => p.id),
  );

  const dice = game.boardgame.dice;
  const rollValues = game.diceRolls.map(d => d.value);

  const stageLabel = game.boardgame.stages?.label ?? DEFAULT_STAGE_LABEL;
  // Only the turn-taking phase is timed player by player, so the pace curve is
  // that phase's and says so — « Évolution du temps par tour » on a game where
  // two thirds of the generation happen elsewhere reads as the whole evening.
  const timedPhase = turnPhase(game.boardgame.phases);
  const paceTitle = timedPhase
    ? `Évolution du temps par tour — phase ${timedPhase.label}`
    : "Évolution du temps par tour";

  return (
    <section className="flex flex-col gap-6">
      <PartyStatTiles
        game={game}
        simultaneous={false}
        pauseCount={stats.totalPauseCount}
      />

      <GameHighlights stats={stats} />

      {/* A game split into phases spends time the turn log never sees — the
          draft, the production. Its recap has to say where it went. */}
      <PhaseTimeSection game={game} stageLabel={stageLabel} />

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

      {dice && rollValues.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Tirages de dés — dans l&apos;ordre
          </h3>
          <DiceTimeline rolls={rollValues} spec={dice} />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            À droite : le total et l&apos;écart à la moyenne attendue — vert /
            rouge au-delà d&apos;un écart-type, gris pour la variance normale.
          </p>
        </div>
      ) : null}

      {game.boardgame.turnCountVaries ? (
        <ScorePaceStats game={game} timeStats={stats.players} />
      ) : null}

      {stats.rounds >= 2 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {paceTitle}
          </h3>
          <TurnTimeChart
            series={timeCurve.series}
            maxSeconds={timeCurve.maxSeconds}
            maxRound={timeCurve.maxRound}
            players={scorePlayers}
            label={paceTitle}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Un point par {stageLabel.toLowerCase()} : le temps moyen d&apos;un
            tour du joueur.
          </p>
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
