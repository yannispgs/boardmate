/**
 * The running tally of a game counted stage by stage (Odin's manches).
 *
 * Such a game has no calendar and no generations: the table closes a manche
 * whenever the cards say so, writes down what each player took, and starts
 * another. The points entered that way are the game's whole score — there is
 * nothing else to count at the end — so the standings are simply the manches
 * summed, and the game stops as soon as one of those sums reaches the target.
 */

import type { PlayerId, StageScore, StageSpec } from "@/lib/domain";

import { type Ranked, rankFinalScores, type ScoreDirection } from "./scoring";
import { stageGoalTotals } from "./stage";

/** One player's line in the standings, as of a given manche. */
export interface Standing extends Ranked {
  /** What that manche cost them, `null` when they have no line for it yet. */
  points: number | null;
}

/**
 * What one player's entry is worth. Kept apart from `StageScore` because the
 * form hands its numbers over before anything has been written down.
 */
export interface StageEntry {
  playerId: PlayerId;
  points: number;
}

/**
 * Why a manche's entry can't be validated yet, or `null` when it can.
 *
 * Each rule is one way of mis-hearing the table, and a wrong total here is
 * carried all the way to the end of the game — so they are all read off the
 * game's own {@link StageSpec} rather than assumed. Odin closes a manche on
 * somebody emptying his hand (`singleExit`) and caps what is left in a hand
 * (`maxPoints`); Papayoo shares out a fixed pile of penalty cards, so nothing
 * caps a single player but the table's points always add up to the same number
 * (`stageTotal`).
 */
export function stageEntryError(
  entries: readonly StageEntry[],
  spec: StageSpec | null,
): string | null {
  if (entries.length === 0) {
    return null;
  }

  if (entries.some(e => e.points < 0)) {
    return "Les points d'une manche ne peuvent pas être négatifs.";
  }

  if (spec?.singleExit === true) {
    const zeroes = entries.filter(e => e.points === 0).length;

    if (zeroes !== 1) {
      return "Un seul joueur doit finir à 0 point.";
    }
  }

  return capError(entries, spec) ?? totalError(entries, spec);
}

/** The ceiling one player cannot go past, when the rules give one. */
function capError(
  entries: readonly StageEntry[],
  spec: StageSpec | null,
): string | null {
  const maxPoints = spec?.maxPoints ?? null;

  if (maxPoints !== null && entries.some(e => e.points > maxPoints)) {
    return `Une manche ne peut pas rapporter plus de ${maxPoints} points.`;
  }

  return null;
}

/**
 * The pile the table shares out, when it is always the same one. Says what is
 * on the table so far, so the sentence doubles as the running count while the
 * boxes are being filled in.
 */
function totalError(
  entries: readonly StageEntry[],
  spec: StageSpec | null,
): string | null {
  const expected = spec?.stageTotal ?? null;

  if (expected === null) {
    return null;
  }

  const total = entries.reduce((sum, e) => sum + e.points, 0);

  if (total !== expected) {
    return `Le total de la manche doit faire ${expected} points (actuellement ${total}).`;
  }

  return null;
}

/**
 * How many manches this game runs, when its length is fixed by the number of
 * players — Papayoo deals one manche per player, so five players play five.
 * `null` for a game nothing stops but its own tally (Odin).
 */
export function stageLimit(
  spec: StageSpec | null,
  playerCount: number,
): number | null {
  const perPlayer = spec?.stagesPerPlayer ?? null;

  return perPlayer === null ? null : perPlayer * playerCount;
}

/** A manche already written down and left behind, with what it cost everyone. */
export interface ClosedStage {
  stage: number;
  /** What each player took that manche, by player id. */
  points: Record<string, number>;
}

/**
 * The manches that are done with, oldest first — everything before the one
 * being played. They are what the table reopens to fix a miscount noticed three
 * manches later, so they carry their own numbers rather than a stage number the
 * caller would have to go and look up.
 */
export function closedStages(
  scores: readonly StageScore[],
  currentStage: number,
): ClosedStage[] {
  const byStage = new Map<number, Record<string, number>>();

  for (const score of scores) {
    if (score.stage >= currentStage) {
      continue;
    }

    const points = byStage.get(score.stage) ?? {};

    points[score.playerId] = score.points;
    byStage.set(score.stage, points);
  }

  return [...byStage.entries()]
    .sort(([a], [b]) => a - b)
    .map(([stage, points]) => ({ stage, points }));
}

/**
 * The standings as of a given manche: everyone's total up to and including it,
 * ranked the way the game reads them, with what that manche cost each player.
 *
 * Players with no line for that manche keep `points: null` rather than a zero
 * they never scored — a zero means « went out », which is the opposite.
 */
export function stageStandings(
  playerIds: readonly PlayerId[],
  scores: readonly StageScore[],
  upToStage: number,
  direction: ScoreDirection,
): Standing[] {
  const upTo = scores.filter(s => s.stage <= upToStage);
  const totals = stageGoalTotals(upTo);
  const ofStage = new Map(
    scores.filter(s => s.stage === upToStage).map(s => [s.playerId, s.points]),
  );

  return rankFinalScores(
    playerIds.map(playerId => ({ playerId, score: totals[playerId] ?? 0 })),
    direction,
  ).map(ranked => ({
    ...ranked,
    points: ofStage.get(ranked.playerId) ?? null,
  }));
}

/**
 * Whether the game stops here: someone has reached the target. The check runs
 * on the totals, never on a single manche — the target is what a player has
 * accumulated, and the manche that takes them past it is still played out.
 */
export function stopReached(
  standings: readonly Standing[],
  target: number,
): boolean {
  return standings.some(s => s.total >= target);
}

/**
 * Whether the manche that just closed was the game's last one, whichever of the
 * two things ends such a game: a fixed count of manches (Papayoo), or a total
 * crossing the target (Odin). A counted game answers on its count alone — it is
 * played to the last deal even if somebody is already buried.
 */
export function lastStageReached(
  standings: readonly Standing[],
  stage: number,
  target: number | null,
  limit: number | null,
): boolean {
  if (limit !== null) {
    return stage >= limit;
  }

  return target !== null && stopReached(standings, target);
}

/**
 * The final scores of such a game, ready to be recorded: every player's manches
 * summed. Nothing is asked at the end because nothing is left to count.
 */
export function stageFinalScores(
  playerIds: readonly PlayerId[],
  scores: readonly StageScore[],
): Array<{ playerId: PlayerId; score: number }> {
  const totals = stageGoalTotals(scores);

  return playerIds.map(playerId => ({
    playerId,
    score: totals[playerId] ?? 0,
  }));
}
