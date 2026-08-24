import type { ReactNode } from "react";

import { InfoTip } from "@/components/InfoTip";
import { StatTile } from "@/components/StatTile";
import type { PopulatedGame } from "@/lib/domain";
import { DEFAULT_STAGE_LABEL } from "@/lib/game/finished-setup";
import { formatDuration } from "@/lib/game/format-time";
import { turnPhase } from "@/lib/game/phase-stats";
import { buildScoreSeries } from "@/lib/game/score-series";
import { computeGameStats } from "@/lib/game/stats";
import { hasPlayStats } from "@/lib/game/turn-time";
import { buildTurnTimeSeries } from "@/lib/game/turn-time-series";
import { DiceTimeline } from "./DiceTimeline";
import { GameHighlights } from "./GameHighlights";
import { PhaseTimeSection } from "./PhaseTimeSection";
import { PlayerStatCardList } from "./PlayerStatCardList";
import { ScoreChart } from "./ScoreChart";
import { ScorePaceStats } from "./ScorePaceStats";
import { SimultaneousGameStats } from "./SimultaneousGameStats";
import { TallyGameStats } from "./TallyGameStats";
import { TurnTimeChart } from "./TurnTimeChart";

/**
 * The end-of-game statistics panel (time & rhythm). Reveals below the winner
 * banner when the player scrolls. All figures are derived client-side from the
 * turn log by `computeGameStats`; nothing here needs the network.
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

  const tiles: {
    label: string;
    value: string;
    accent?: boolean;
    info?: ReactNode;
  }[] = [
    {
      label: "Temps de jeu",
      value: formatDuration(stats.activeTotalS),
      accent: true,
    },
    {
      label: "Tours",
      value: String(stats.rounds),
      info: (
        <InfoTip label="Tours">
          <p>
            Nombre de <strong>tours de table</strong> joués (un tour = chaque
            joueur a joué une fois).
          </p>
          <p>Différent de « Tour moyen », qui est une durée.</p>
        </InfoTip>
      ),
    },
    {
      label: "Tour moyen",
      value: formatDuration(stats.avgRoundS),
      info: (
        <InfoTip label="Tour moyen">
          <p>
            <strong>Durée moyenne d&apos;un tour de table</strong> (tous les
            joueurs).
          </p>
          <p>Différent de « Tours », qui en compte le nombre.</p>
        </InfoTip>
      ),
    },
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
      info: (
        <InfoTip label="Dépassement">
          Temps total joué <strong>au-delà du chrono du tour</strong> (le
          minuteur compte à rebours, puis compte le dépassement une fois à
          zéro).
        </InfoTip>
      ),
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
            info={t.info}
          />
        ))}
      </div>

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
