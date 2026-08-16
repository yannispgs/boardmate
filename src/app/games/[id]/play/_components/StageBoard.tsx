"use client";

import { useState } from "react";

import type { PlayerId, PopulatedGame, StageSpec } from "@/lib/domain";
import type { ScoreDirection } from "@/lib/game/scoring";
import {
  closedStages,
  lastStageReached,
  stageEntryError,
  stageFinalScores,
  stageLimit,
  stageStandings,
} from "@/lib/game/stage-tally";

import { namedPlayers } from "./named-players";
import { PastStageCardList } from "./PastStageCardList";
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
  // The manche whose points are open for entry: the one being closed, or an
  // earlier one being put right. Null when the form is shut.
  const [entryStage, setEntryStage] = useState<number | null>(null);
  // The manche the recap is showing, which is the one that just closed — the
  // game may already have moved on by the time it is dismissed.
  const [recapStage, setRecapStage] = useState<number | null>(null);

  const players = namedPlayers(game);
  const seats = players.map(p => p.id);
  const target = game.winThreshold;
  const unit = stageLabel.toLowerCase();
  const spec = game.boardgame.stages;
  const limit = stageLimit(spec, seats.length);
  const past = closedStages(goals.scores, game.stage);

  const standings = stageStandings(seats, goals.scores, game.stage, direction);
  const recap =
    recapStage === null
      ? null
      : stageStandings(seats, goals.scores, recapStage, direction);
  const stopped =
    recap !== null &&
    recapStage !== null &&
    lastStageReached(recap, recapStage, target, limit);

  /** Writes a manche down: the one being closed, or an older one put right. */
  async function saveEntry(
    stage: number,
    points: Parameters<StageGoalLog["save"]>[1],
  ) {
    setEntryStage(null);
    await goals.save(stage, points);

    // Only the manche that just ended calls the table round to read the
    // standings out; correcting an old one puts them right where they stand,
    // in a game that has long moved on.
    if (stage === game.stage) {
      setRecapStage(stage);
    }
  }

  async function openNextStage() {
    await onNextStage();
    setRecapStage(null);
  }

  return (
    <>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {targetNote(target, limit, unit, direction)}
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
          onClick={() => setEntryStage(game.stage)}
          className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Fin de la {unit} {game.stage}
          {limit === null ? "" : ` / ${limit}`} →
        </button>

        <PastStageCardList
          closed={past}
          stageLabel={stageLabel}
          players={players}
          disabled={disabled}
          onEdit={setEntryStage}
        />
      </div>

      {entryStage === null ? null : (
        <StagePointsPrompt
          stage={entryStage}
          stageLabel={stageLabel}
          intro={pointsIntro(spec)}
          players={players}
          initial={goals.entered(entryStage)}
          validate={entries => stageEntryError(entries, spec)}
          max={spec?.maxPoints ?? null}
          disabled={disabled}
          confirmLabel="Valider"
          onConfirm={points => void saveEntry(entryStage, points)}
          onCancel={() => setEntryStage(null)}
        />
      )}

      {recap === null || recapStage === null ? null : (
        <StageRecap
          stage={recapStage}
          stageLabel={stageLabel}
          standings={recap}
          players={players}
          target={target}
          stopped={stopped}
          stopNote={stopNote(target, limit, unit)}
          disabled={disabled}
          onNext={() => void openNextStage()}
          onEnd={() => void onEnd(stageFinalScores(seats, goals.scores))}
        />
      )}
    </>
  );
}

/** The rule the boxes are filled in by, as the game's own sheet states it. */
function pointsIntro(spec: StageSpec | null): string {
  if (spec?.stageTotal !== undefined) {
    return `Points de chacun : le total de la manche doit faire ${spec.stageTotal}.`;
  }

  if (spec?.singleExit !== true) {
    return "Points de chacun sur cette manche.";
  }

  const rule = "Points de chacun : 0 pour celui qui termine, au moins 1 pour";
  const maxPoints = spec.maxPoints ?? null;

  return maxPoints === null
    ? `${rule} les autres.`
    : `${rule} les autres, ${maxPoints} au plus.`;
}

/** Which end of the standings takes the game, in words. */
function winsNote(direction: ScoreDirection): string {
  return direction === "lowest"
    ? "le plus petit total gagne"
    : "le plus gros total gagne";
}

/** What the table is playing to, spelled out above the standings. */
function targetNote(
  target: number | null,
  limit: number | null,
  unit: string,
  direction: ScoreDirection,
): string {
  const wins = winsNote(direction);

  if (limit !== null) {
    return `La partie se joue en ${limit} ${unit}s : ${wins}.`;
  }

  return target === null
    ? `La partie s'arrête quand vous le décidez : ${wins}.`
    : `La partie s'arrête dès que quelqu'un atteint ${target} points : ${wins}.`;
}

/** Why the game stops here, read out on the recap of its last manche. */
function stopNote(
  target: number | null,
  limit: number | null,
  unit: string,
): string {
  if (limit !== null) {
    return `La ${unit} ${limit} était la dernière : la partie s'arrête ici.`;
  }

  return `La barre des ${target} points est franchie : la partie s'arrête ici.`;
}
