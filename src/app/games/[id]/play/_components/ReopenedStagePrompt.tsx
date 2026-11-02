"use client";

import type { PlayerId, PopulatedGame, StageScore } from "@/lib/domain";
import { type StageEntry, stageFlags } from "@/lib/game/stage-tally";

import { BetPointsPrompt } from "./BetPointsPrompt";
import { StagePointsPrompt } from "./StagePointsPrompt";
import type { StageTally } from "./stage-tallies";

/**
 * A manche of a finished party, reopened for a correction with the prompt the
 * table filled in during play: the bets and the safety token on Luz, the
 * points (and the phases, on Phase 10) everywhere else.
 */
export function ReopenedStagePrompt({
  game,
  tally,
  stage,
  stageLabel,
  players,
  recorded,
  stageScores,
  intro,
  disabled,
  onConfirm,
  onCancel,
}: Readonly<{
  game: PopulatedGame;
  /** How the game reads its manches, when the table closed them itself. */
  tally: StageTally | null;
  stage: number;
  stageLabel: string;
  players: Array<{ id: PlayerId; name: string }>;
  /** What was recorded for the manche, by player. */
  recorded: Record<string, number>;
  stageScores: readonly StageScore[];
  /** The goal tile read out, for a game laid out on a calendar (Wingspan). */
  intro: string;
  disabled: boolean;
  onConfirm: (points: StageEntry[]) => void;
  onCancel: () => void;
}>) {
  const bet = game.boardgame.stages?.bet;

  if (bet !== undefined && tally !== null) {
    return (
      <BetPointsPrompt
        stage={stage}
        stageLabel={stageLabel}
        players={players}
        bet={bet}
        initial={recorded}
        initialHedged={stageFlags(stageScores, stage, "hedged")}
        validate={entries => tally.validate(entries, stage)}
        disabled={disabled}
        confirmLabel="Valider"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }

  return (
    <StagePointsPrompt
      stage={stage}
      stageLabel={stageLabel}
      intro={tally?.intro ?? intro}
      players={players}
      initial={recorded}
      initialCleared={stageFlags(stageScores, stage, "cleared")}
      rungs={tally?.rungs(stageScores, stage) ?? null}
      validate={
        tally === null ? undefined : entries => tally.validate(entries, stage)
      }
      max={tally?.max ?? null}
      step={tally?.step ?? 1}
      disabled={disabled}
      confirmLabel="Valider"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
