"use client";

import { useState } from "react";

import type { PlayerId, PopulatedGame } from "@/lib/domain";
import type { ScoreDirection } from "@/lib/game/scoring";
import {
  stageEntryError,
  stageFinalScores,
  stageStandings,
  stopReached,
} from "@/lib/game/stage-tally";

import { namedPlayers } from "./named-players";
import { StagePointsPrompt } from "./StagePointsPrompt";
import { StageRecap } from "./StageRecap";
import { StandingCardList } from "./StandingCardList";
import type { StageGoalLog } from "./use-stage-goals";

/**
 * The whole play screen of a game counted manche by manche (Odin).
 *
 * Nothing is timed and nobody is « up »: such a game runs on the table's own
 * say-so, and the only thing the app can usefully hold is the tally. So the
 * screen is the standings and the one button that closes a manche — points in,
 * recap out, and the game stops itself when a total reaches the target.
 */
export function StageBoard({
  game,
  goals,
  stageLabel,
  direction,
  disabled,
  onNextStage,
  onEnd,
}: Readonly<{
  game: PopulatedGame;
  goals: StageGoalLog;
  /** What the box calls a stage (« Manche »). */
  stageLabel: string;
  /** Which end of the standings wins — the lowest total, in Odin. */
  direction: ScoreDirection;
  disabled: boolean;
  /** Opens the next manche. */
  onNextStage: () => Promise<void>;
  /** Ends the game on the totals the manches added up to. */
  onEnd: (
    scores: Array<{ playerId: PlayerId; score: number }>,
  ) => Promise<void>;
}>) {
  const [promptOpen, setPromptOpen] = useState(false);
  // The manche the recap is showing, which is the one that just closed — the
  // game may already have moved on by the time it is dismissed.
  const [recapStage, setRecapStage] = useState<number | null>(null);

  const players = namedPlayers(game);
  const seats = players.map(p => p.id);
  const target = game.winThreshold;
  const unit = stageLabel.toLowerCase();

  const standings = stageStandings(seats, goals.scores, game.stage, direction);
  const recap =
    recapStage === null
      ? null
      : stageStandings(seats, goals.scores, recapStage, direction);
  const stopped =
    recap !== null && target !== null && stopReached(recap, target);

  /** Writes the manche down, then hands the table its standings. */
  async function closeStage(points: Parameters<StageGoalLog["save"]>[1]) {
    setPromptOpen(false);
    await goals.save(game.stage, points);
    setRecapStage(game.stage);
  }

  async function openNextStage() {
    await onNextStage();
    setRecapStage(null);
  }

  return (
    <>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {targetNote(target, direction)}
        </p>

        <StandingCardList
          standings={standings}
          players={players}
          showPoints={false}
          target={target}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => setPromptOpen(true)}
          className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Fin de la {unit} {game.stage} →
        </button>
      </div>

      {promptOpen ? (
        <StagePointsPrompt
          stage={game.stage}
          stageLabel={stageLabel}
          intro="Points de chacun : 0 pour celui qui termine, au moins 1 pour les autres."
          players={players}
          initial={goals.entered(game.stage)}
          validate={stageEntryError}
          disabled={disabled}
          confirmLabel="Valider"
          onConfirm={points => void closeStage(points)}
          onCancel={() => setPromptOpen(false)}
        />
      ) : null}

      {recap === null || recapStage === null ? null : (
        <StageRecap
          stage={recapStage}
          stageLabel={stageLabel}
          standings={recap}
          players={players}
          target={target}
          stopped={stopped}
          disabled={disabled}
          onNext={() => void openNextStage()}
          onEnd={() => void onEnd(stageFinalScores(seats, goals.scores))}
        />
      )}
    </>
  );
}

/** What the table is playing to, spelled out above the standings. */
function targetNote(target: number | null, direction: ScoreDirection): string {
  const wins =
    direction === "lowest"
      ? "le plus petit total gagne"
      : "le plus gros total gagne";

  return target === null
    ? `La partie s'arrête quand vous le décidez : ${wins}.`
    : `La partie s'arrête dès que quelqu'un atteint ${target} points : ${wins}.`;
}
