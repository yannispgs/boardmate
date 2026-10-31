import type { ReactNode } from "react";

import type {
  PlayerId,
  PopulatedGame,
  StageBet,
  StageScore,
} from "@/lib/domain";
import { betDone, betEntryError } from "@/lib/game/bet";
import type { EndOutcome } from "@/lib/game/end-outcome";
import {
  type LadderEntryRules,
  ladderDone,
  ladderEntryError,
  ladderOutcome,
  ladderRungs,
  ladderStandings,
  workingRung,
} from "@/lib/game/ladder";
import type { ScoreDirection } from "@/lib/game/scoring";
import {
  type StageEntry,
  stageEntryError,
  stageFinalScores,
  stageStandings,
  stopReached,
} from "@/lib/game/stage-tally";

import { LadderStandingCardList } from "./LadderStandingCardList";
import { StandingCardList } from "./StandingCardList";
import { pointsIntro } from "./stage-intro";

type Seats = ReadonlyArray<{ id: PlayerId; name: string }>;

/** What a manche prompt shows of the ladder: each player's rung and its name. */
export type PromptRungs = {
  label: string;
  /** What the entry is checked against — the floor of a whole hand among it. */
  rules: LadderEntryRules;
  of: Record<string, { rung: number; step: string }>;
} | null;

/**
 * How a game counted manche by manche reads its manches: what the standings
 * look like, when the game stops, what a manche's entry must satisfy, and how
 * the game ends. Three games, three ways — Odin's totals racing to a bar,
 * Phase 10's climb up a ladder, Luz's bets over four donnes — behind one shape,
 * so the board itself is written once.
 */
export interface StageTally {
  /** The line under the title: what the table is playing to. */
  note: string;
  /** The standings once `upTo` is written down. */
  board: (
    scores: readonly StageScore[],
    upTo: number,
    recap: boolean,
  ) => ReactNode;
  /** Whether the game stops once `upTo` is written down. */
  stops: (scores: readonly StageScore[], upTo: number) => boolean;
  /** Why it stops, read out in the recap of its last manche. */
  stopNote: string;
  /** The rule the prompt's boxes are filled in by. */
  intro: string;
  /** Why manche `stage`'s entry can't be recorded, or null. */
  validate: (entries: StageEntry[], stage: number) => string | null;
  max: number | null;
  step: number;
  /** The rung each player is on as manche `stage` opens, or null. */
  rungs: (scores: readonly StageScore[], stage: number) => PromptRungs;
  /** How the game ends on the manches written down. */
  end: (scores: readonly StageScore[]) => EndOutcomeRequest;
}

/** What closing the game hands to the end flow: totals, or a whole outcome. */
export type EndOutcomeRequest =
  | { kind: "totals"; scores: Array<{ playerId: PlayerId; score: number }> }
  | { kind: "outcome"; outcome: EndOutcome };

/** The tally that fits this game. */
export function stageTally(
  game: PopulatedGame,
  players: Seats,
  direction: ScoreDirection,
): StageTally {
  const stages = game.boardgame.stages;

  if (stages?.ladder !== undefined) {
    return ladderTally(game, players, stages.ladder);
  }

  if (stages?.bet !== undefined) {
    return betTally(players, stages.label, stages.bet, stages.count ?? 1);
  }

  return totalsTally(game, players, direction);
}

/** Odin: the manches summed, the game stopping once a total reaches the bar. */
function totalsTally(
  game: PopulatedGame,
  players: Seats,
  direction: ScoreDirection,
): StageTally {
  const seats = players.map(p => p.id);
  const target = game.winThreshold;
  const maxPoints = game.boardgame.stages?.maxPoints ?? null;
  const wins =
    direction === "lowest"
      ? "le plus petit total gagne"
      : "le plus gros total gagne";

  return {
    note:
      target === null
        ? `La partie s'arrête quand vous le décidez : ${wins}.`
        : `La partie s'arrête dès que quelqu'un atteint ${target} points : ${wins}.`,
    board: (scores, upTo, recap) => (
      <StandingCardList
        standings={stageStandings(seats, scores, upTo, direction)}
        players={players}
        showPoints={recap}
        target={target}
      />
    ),
    stops: (scores, upTo) =>
      target !== null &&
      stopReached(stageStandings(seats, scores, upTo, direction), target),
    stopNote: `La barre des ${target} points est franchie : la partie s'arrête ici.`,
    intro: pointsIntro(maxPoints),
    validate: entries => stageEntryError(entries, maxPoints),
    max: maxPoints,
    step: 1,
    rungs: () => null,
    end: scores => ({
      kind: "totals",
      scores: stageFinalScores(seats, scores),
    }),
  };
}

/** Phase 10: a climb up the ladder, the points only separating level climbers. */
function ladderTally(
  game: PopulatedGame,
  players: Seats,
  ladder: NonNullable<
    NonNullable<PopulatedGame["boardgame"]["stages"]>["ladder"]
  >,
): StageTally {
  const seats = players.map(p => p.id);
  const top = ladder.steps.length;
  const fixed = game.ladderFixed === true;
  const step = game.boardgame.stages?.pointsStep ?? 1;
  const maxPoints = game.boardgame.stages?.maxPoints ?? null;
  const rules: LadderEntryRules = {
    fixed,
    step,
    maxPoints,
    unclearedMin: ladder.unclearedMin ?? 0,
  };
  const rung = ladder.label.toLowerCase();

  return {
    note: fixed
      ? `La partie dure ${top} manches, tout le monde avance à chaque manche : le plus petit total gagne.`
      : `Le premier à réaliser la ${rung} ${top} gagne ; à égalité, le plus petit total.`,
    board: (scores, upTo, recap) => (
      <LadderStandingCardList
        standings={ladderStandings(seats, scores, upTo, top, fixed)}
        players={players}
        rungLabel={ladder.label}
        top={top}
        showPoints={recap}
      />
    ),
    stops: (scores, upTo) => ladderDone(seats, scores, upTo, top, fixed),
    stopNote: fixed
      ? `C'était la ${top}ᵉ manche : la partie s'arrête ici.`
      : `La ${rung} ${top} est réalisée : la partie s'arrête ici.`,
    intro: fixed
      ? "Points en main de chacun : 0 pour celui qui termine."
      : "Points en main de chacun : 0 pour celui qui termine. Cochez la phase de ceux qui l'ont posée.",
    validate: entries => ladderEntryError(entries, rules),
    max: maxPoints,
    step,
    rungs: (scores, stage) => {
      if (fixed) {
        return null;
      }

      const before = ladderRungs(seats, scores, stage - 1, top, fixed);

      return {
        label: ladder.label,
        rules,
        of: Object.fromEntries(
          seats.map(id => {
            const working = workingRung(before[id], top);

            return [id, { rung: working, step: ladder.steps[working - 1] }];
          }),
        ),
      };
    },
    end: scores => ({
      kind: "outcome",
      outcome: ladderOutcome(seats, scores, top, fixed),
    }),
  };
}

/** Luz: a set number of donnes played on bets, the highest total winning. */
function betTally(
  players: Seats,
  stageLabel: string,
  bet: StageBet,
  count: number,
): StageTally {
  const seats = players.map(p => p.id);
  const unit = stageLabel.toLowerCase();

  return {
    note: `La partie dure ${count} ${unit}s : le plus gros total gagne.`,
    board: (scores, upTo, recap) => (
      <StandingCardList
        standings={stageStandings(seats, scores, upTo, "highest")}
        players={players}
        showPoints={recap}
        target={null}
      />
    ),
    stops: (scores, upTo) => betDone(scores, upTo, count),
    stopNote: `C'était la ${count}ᵉ ${unit} : la partie s'arrête ici.`,
    intro: `Pari réussi : ${bet.win} × le numéro de la ${unit} (${bet.hedgedWin} × avec le ${bet.hedgeLabel.toLowerCase()}), sinon −${bet.missPerTrick} par pli d'écart.`,
    validate: (entries, stage) =>
      betEntryError(entries, bet, stage, stageLabel),
    max: null,
    step: 1,
    rungs: () => null,
    end: scores => ({
      kind: "totals",
      scores: stageFinalScores(seats, scores),
    }),
  };
}
