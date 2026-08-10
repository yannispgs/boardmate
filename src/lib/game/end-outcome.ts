import type { PlayerId, ScoreSheetItem, WinCondition } from "@/lib/domain";
import { pairBreakdown, scorePiles } from "./pair-scoring";
import {
  type Ranked,
  rankByTotal,
  rankFinalScores,
  scoreCategories,
  winnerDirection,
} from "./scoring";
import { loneLeader } from "./tie-break";

/** Final scores about to be persisted, with the breakdown when there is one. */
export type FinalScores = Array<{
  playerId: PlayerId;
  score: number;
  breakdown?: Record<string, number>;
}>;

/**
 * How a scored game came out, driving the reveal and then the score sheet.
 * Which sheet it was decides what that layout is: the per-category grid
 * (`values`), the ring of shared piles (`piles`), or neither.
 */
export interface EndOutcome {
  scores: FinalScores;
  ranking: Ranked[];
  /** The per-category values to lay out after the reveal, or null. */
  values: Record<string, Record<string, number>> | null;
  /** The shared piles to lay out after the reveal, or null. */
  piles: Record<string, number> | null;
  /**
   * Who won — **empty while the leaders are level** and the tie is unbroken, so
   * nothing is written and nothing shown until the reveal reaches their place
   * and the table settles it there.
   */
  winners: PlayerId[];
}

/** A category sheet: each player's lines summed into a total, then ranked. */
export function categoryOutcome(
  sheet: ScoreSheetItem[],
  values: Record<string, Record<string, number>>,
  playerIds: PlayerId[],
): EndOutcome {
  const scored = scoreCategories(sheet, values, playerIds);
  const totals = playerIds.map(playerId => ({
    playerId,
    total: scored[playerId].total,
  }));
  const scores = totals.map(({ playerId, total }) => ({
    playerId,
    score: total,
    breakdown: values[playerId] ?? {},
  }));

  return {
    scores,
    ranking: rankByTotal(totals),
    values,
    piles: null,
    // A category sheet is always summed highest-first, so the leader is the
    // player alone on rank 1 — nobody while several share it.
    winners: leaderOrNone(loneLeader(scores, "highest")),
  };
}

/**
 * Pair scoring (Splito): each player's total is the product of the two piles
 * flanking his seat, so the piles entered once around the ring score everyone.
 */
export function pairOutcome(
  seats: PlayerId[],
  piles: Record<string, number>,
): EndOutcome {
  const scored = scorePiles(seats, piles);
  const scores = seats.map(playerId => ({
    playerId,
    score: scored[playerId].total,
    breakdown: pairBreakdown(scored[playerId]),
  }));

  return {
    scores,
    ranking: rankByTotal(
      seats.map(playerId => ({ playerId, total: scored[playerId].total })),
    ),
    values: null,
    piles,
    // The product is always read highest-first, like a category sheet.
    winners: leaderOrNone(loneLeader(scores, "highest")),
  };
}

/**
 * A game scored on a final total: the leader wins, unless the table named
 * someone else by hand (`override`) or several players finished level — the
 * reveal then offers to apply the game's own rules once it gets there.
 */
export function totalOutcome(
  scores: Array<{ playerId: PlayerId; score: number }>,
  winCondition: WinCondition | null,
  override: PlayerId | null,
): EndOutcome {
  const direction =
    winCondition === null ? "highest" : winnerDirection(winCondition);

  return {
    scores,
    ranking: rankFinalScores(scores, direction),
    values: null,
    piles: null,
    winners: leaderOrNone(override ?? loneLeader(scores, direction)),
  };
}

function leaderOrNone(leader: PlayerId | null): PlayerId[] {
  return leader ? [leader] : [];
}
