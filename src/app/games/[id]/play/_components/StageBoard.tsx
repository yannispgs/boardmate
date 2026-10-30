"use client";

import { useState } from "react";

import type { PopulatedGame } from "@/lib/domain";
import type { ScoreDirection } from "@/lib/game/scoring";
import { closedStages } from "@/lib/game/stage-tally";

import { LapCounter } from "./LapCounter";
import { namedPlayers } from "./named-players";
import { PastStageCardList } from "./PastStageCardList";
import { StagePointsPrompt } from "./StagePointsPrompt";
import { StageRecap } from "./StageRecap";
import { type EndOutcomeRequest, stageTally } from "./stage-tallies";
import type { StageGoalLog } from "./use-stage-goals";
import type { StageLaps } from "./use-stage-laps";

/**
 * The whole play screen of a game counted manche by manche (Odin, Phase 10).
 *
 * Nobody is « up »: such a game runs on the table's own say-so, and the thing
 * the app can usefully hold is the tally. So the screen is the standings and
 * the one button that closes a manche — points in, recap out, and the game
 * stops itself when the tally says so: a total reaching the bar in Odin, the
 * last phase cleared in Phase 10. How each reads its manches is
 * {@link stageTally}'s business.
 */
export function StageBoard({
  game,
  goals,
  laps,
  stageLabel,
  direction,
  disabled,
  onNextStage,
  onStageClosed,
  onEnd,
}: Readonly<{
  game: PopulatedGame;
  goals: StageGoalLog;
  /** The laps of the manche, counted by the table — null where nobody counts. */
  laps: StageLaps | null;
  /** What the box calls a stage (« Manche »). */
  stageLabel: string;
  /** Which end of the standings wins — the lowest total, in Odin. */
  direction: ScoreDirection;
  disabled: boolean;
  /** Opens the next manche. */
  onNextStage: () => Promise<void>;
  /**
   * The manche being played has just been written down — where a game that
   * times its manches banks the clock.
   */
  onStageClosed: (stage: number) => void;
  /** Ends the game on what the manches added up to. */
  onEnd: (request: EndOutcomeRequest) => Promise<void>;
}>) {
  // The manche whose points are open for entry: the one being closed, or an
  // earlier one being put right. Null when the form is shut.
  const [entryStage, setEntryStage] = useState<number | null>(null);
  // The manche the recap is showing, which is the one that just closed — the
  // game may already have moved on by the time it is dismissed.
  const [recapStage, setRecapStage] = useState<number | null>(null);

  const players = namedPlayers(game);
  const tally = stageTally(game, players, direction);
  const unit = stageLabel.toLowerCase();
  const past = closedStages(goals.scores, game.stage);
  const stopped = recapStage !== null && tally.stops(goals.scores, recapStage);

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
      onStageClosed(stage);
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
        {/* The controls first, right under the clock: they are what the table
            reaches for during the manche, and the standings below are only
            read between two of them — nobody should scroll to end a manche. */}
        {laps === null ? null : <LapCounter laps={laps} disabled={disabled} />}

        <button
          type="button"
          disabled={disabled}
          onClick={() => setEntryStage(game.stage)}
          className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Fin de la {unit} {game.stage} →
        </button>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">{tally.note}</p>

        {tally.board(goals.scores, game.stage, false)}

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
          intro={tally.intro}
          players={players}
          initial={goals.entered(entryStage)}
          initialCleared={goals.cleared(entryStage)}
          rungs={tally.rungs(goals.scores, entryStage)}
          validate={tally.validate}
          max={tally.max}
          step={tally.step}
          disabled={disabled}
          confirmLabel="Valider"
          onConfirm={points => void saveEntry(entryStage, points)}
          onCancel={() => setEntryStage(null)}
        />
      )}

      {recapStage === null ? null : (
        <StageRecap
          stage={recapStage}
          stageLabel={stageLabel}
          board={tally.board(goals.scores, recapStage, true)}
          stopNote={tally.stopNote}
          stopped={stopped}
          disabled={disabled}
          onNext={() => void openNextStage()}
          onEnd={() => void onEnd(tally.end(goals.scores))}
        />
      )}
    </>
  );
}
