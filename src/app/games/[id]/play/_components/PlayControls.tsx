"use client";

import type {
  PhaseSpec,
  PlayerId,
  PopulatedGame,
  RoundGoal,
} from "@/lib/domain";
import { needsPhaseButton, nextPhase } from "@/lib/game/phase";
import type { ScoreDirection } from "@/lib/game/scoring";
import { stageGoalLabel, stageScores } from "@/lib/game/stage";
import { namedPlayers } from "./named-players";
import { PhaseControls } from "./PhaseControls";
import { StageBoard } from "./StageBoard";
import { TurnControls } from "./TurnControls";
import type { StageGoalLog } from "./use-stage-goals";

/**
 * What the table acts on at the bottom of the play screen: the turn controls,
 * the button that closes a simultaneous phase, or — for a game with no turns to
 * speak of — the manche board. All three give way to the end-of-game score
 * form, so this renders nothing once that is open.
 *
 * It lives in its own file because it is the one place on the screen where four
 * shapes of game meet, and every game the app learns adds a branch. Left inline
 * it was the play screen's centre of gravity, and reading the screen meant
 * reading it first.
 */
export function PlayControls({
  game,
  goals,
  phases,
  phase,
  phaseSwapping,
  stageLabel,
  direction,
  catalogue,
  atFinalTurn,
  atStageEnd,
  entryOpen,
  timed,
  byHand,
  generations,
  busy,
  onNext,
  onPass,
  onEndPhase,
  onNextStage,
  onEnd,
}: Readonly<{
  game: PopulatedGame;
  goals: StageGoalLog;
  /** The phases this game is played in, or null for a game with none. */
  phases: PhaseSpec[] | null;
  /** The phase being played, or null. */
  phase: PhaseSpec | null;
  /** The two clocks are still crossing: closing another phase has to wait. */
  phaseSwapping: boolean;
  /** What the box calls a stage — « Génération », « Manche ». */
  stageLabel: string;
  direction: ScoreDirection;
  /** Every goal tile the game can be set up with, extensions included. */
  catalogue: RoundGoal[];
  atFinalTurn: boolean;
  atStageEnd: boolean;
  /** The end-of-game score form is open and owns the screen. */
  entryOpen: boolean;
  /** The app puts a clock on this game at all. */
  timed: boolean;
  /** The table closes its own manches (Odin, Papayoo). */
  byHand: boolean;
  /** Somebody can step out of the generation early (Terraforming Mars). */
  generations: boolean;
  busy: boolean;
  onNext: () => Promise<void>;
  onPass: () => void;
  onEndPhase: (closing: PhaseSpec) => void;
  onNextStage: () => Promise<void>;
  onEnd: (
    scores: Array<{ playerId: PlayerId; score: number }>,
  ) => Promise<void>;
}>) {
  if (entryOpen) {
    return null;
  }

  // A phase everybody plays at once has no turn to advance, so the table closes
  // the phase itself instead.
  if (phase !== null && needsPhaseButton(phase)) {
    return (
      <PhaseControls
        nextLabel={
          nextPhase(phases, game.phase)?.label ??
          `${stageLabel} ${game.stage + 1}`
        }
        disabled={busy || phaseSwapping}
        onEndPhase={() => {
          onEndPhase(phase);
        }}
      />
    );
  }

  // Untimed and not counted in manches either (Papayoo): nothing happens
  // between sitting down and writing the score, so the screen offers nothing
  // but the end-of-game form below.
  if (!timed && !byHand) {
    return null;
  }

  if (byHand) {
    return (
      <StageBoard
        game={game}
        goals={goals}
        stageLabel={stageLabel}
        direction={direction}
        disabled={busy || goals.busy}
        onNextStage={onNextStage}
        onEnd={onEnd}
      />
    );
  }

  return (
    <TurnControls
      atFinalTurn={atFinalTurn}
      atStageEnd={atStageEnd}
      goalScores={stageScores(game.stages[game.stage - 1], catalogue)}
      stage={game.stage}
      stageLabel={stageLabel}
      goalLabel={stageGoalLabel(game.stages[game.stage - 1], catalogue)}
      players={namedPlayers(game)}
      entered={goals.entered(game.stage)}
      disabled={busy || goals.busy}
      onNext={onNext}
      onPass={generations ? onPass : null}
      onScoreGoal={points => goals.save(game.stage, points)}
    />
  );
}
