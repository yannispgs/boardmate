import type { ScoringSpec } from "@/lib/domain";

/**
 * Games that let the lap finish before they stop.
 *
 * Most games end the instant somebody reaches the target: at Catan, getting to
 * 10 on your own turn *is* the victory and the players after you never answer.
 * Splendor doesn't work like that — the lap is played out so everyone has had
 * the same number of turns, and whoever is still to play can overtake the leader
 * on his last turn.
 */
export function stopsAtRoundEnd(scoring: ScoringSpec | null): boolean {
  return scoring?.stopCondition?.timing === "roundEnd";
}

/** A score as it was recorded: the total, and the lap it was reached in. */
export interface ScoredRound {
  score: number;
  round: number;
}

/**
 * The lap that closes the game: the one the target was first reached in. `null`
 * while the game has no reason to stop.
 *
 * Read off what is **recorded** rather than remembered in a flag raised at the
 * moment it happened, so a tab reloaded in the middle of the final lap still
 * knows the game is on its way out.
 *
 * `scores` is the standing as it is now, and it has a veto: a total typed by
 * mistake and corrected back down leaves its event behind for good, and without
 * this the game would keep insisting on ending a lap nobody won.
 */
export function closingRound(
  events: readonly ScoredRound[],
  scores: readonly number[],
  threshold: number | null,
): number | null {
  if (threshold === null || !scores.some(score => score >= threshold)) {
    return null;
  }

  const reached = events
    .filter(event => event.score >= threshold)
    .map(event => event.round);

  return reached.length === 0 ? null : Math.min(...reached);
}

/**
 * The lap the turn order cannot go past — what the ribbon needs to draw its
 * finish flag: the game's own fixed length, the lap about to close it, or
 * whichever of the two comes first.
 */
export function lastRound(
  roundLimit: number | null,
  closing: number | null,
): number | null {
  if (roundLimit === null) {
    return closing;
  }

  if (closing === null) {
    return roundLimit;
  }

  return Math.min(roundLimit, closing);
}

/**
 * Whether that final lap has been played out. Asked once the turn has moved on,
 * so the seat holding it now belongs to the lap *after* the one that ends the
 * game — which is exactly what says everybody has had his turn.
 */
export function roundPlayedOut(stop: number | null, turn: number): boolean {
  return stop !== null && turn > stop;
}
