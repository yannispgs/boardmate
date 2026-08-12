/**
 * The running tally of a game counted stage by stage (Odin's manches).
 *
 * Such a game has no calendar and no generations: the table closes a manche
 * whenever the cards say so, writes down what each player took, and starts
 * another. The points entered that way are the game's whole score — there is
 * nothing else to count at the end — so the standings are simply the manches
 * summed, and the game stops as soon as one of those sums reaches the target.
 */

import type { PlayerId, StageScore } from "@/lib/domain";

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
 * Exactly one player goes out, and everybody else is left holding something:
 * one zero, and no other player below one. Both halves are checked because
 * both are ways of mis-hearing the table, and a wrong total here is carried to
 * the end of the game.
 */
export function stageEntryError(entries: readonly StageEntry[]): string | null {
  if (entries.length === 0) {
    return null;
  }

  const zeroes = entries.filter(e => e.points === 0).length;

  if (zeroes !== 1) {
    return "Un seul joueur doit finir à 0 point.";
  }

  if (entries.some(e => e.points < 0)) {
    return "Les points d'une manche ne peuvent pas être négatifs.";
  }

  return null;
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
