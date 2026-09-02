/**
 * Where a player finished, read two ways: his **rank** in the party, and that
 * rank turned into a figure that compares across table sizes.
 *
 * Both were born inside the seat statistics, where « the first to play finishes
 * 3rd on average » only means something once a 3-player party and a 6-player
 * one can be put side by side. They live here because a second reader now wants
 * the same two figures — who your neighbours finish as, on a game where the
 * seat is the score — and a ranking computed twice is a ranking that will one
 * day disagree with itself.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { PlayerId } from "@/lib/domain";
import type { ScoreDirection } from "./scoring";

/** A seat as any ranking here reads it: an id and the total on the sheet. */
type Scored = { playerId: PlayerId; score: number | null };

/**
 * Ranks a party on `order`, which decides both the order **and** the ties: two
 * players the comparator cannot separate share the rank of the player above, so
 * two level for the lead are both 1st and the next one is 3rd.
 *
 * `null` if any score is missing. Read as a zero, a missing score would take the
 * first place outright on a game where the smallest total wins — and a
 * half-filled party is not a performance anyway.
 */
function rankOn<T extends Scored>(
  players: readonly T[],
  order: (a: T, b: T) => number,
): Map<PlayerId, number> | null {
  if (players.some(p => p.score === null)) {
    return null;
  }

  const sorted = [...players].sort(order);
  const ranks = new Map<PlayerId, number>();
  let prev: T | null = null;
  let prevRank = 0;

  sorted.forEach((p, i) => {
    const rank = prev !== null && order(prev, p) === 0 ? prevRank : i + 1;

    ranks.set(p.playerId, rank);
    prev = p;
    prevRank = rank;
  });

  return ranks;
}

/** Best total first, whichever end of the scale the game calls the good one. */
function byScore(direction: ScoreDirection) {
  return (a: Scored, b: Scored) => {
    return direction === "highest"
      ? (b.score as number) - (a.score as number)
      : (a.score as number) - (b.score as number);
  };
}

/**
 * 1-based placement per player within one party, **on the score alone** —
 * `null` if any score is missing, ties sharing the rank above.
 *
 * This is what the statistics screens are still counted on — the average
 * position of a seat, and of a neighbour. It is **not** the better reading:
 * every tie-break the app actually carries is a rulebook criterion (Splito's
 * fewest Splito cards, Cascadia's nature tokens, Splendor's development cards),
 * so a player the rules put second belongs second in an average too. Those two
 * figures are simply older than {@link finishPlaces} and move published numbers
 * when they change, which is a change of its own.
 */
export function placements(
  players: ReadonlyArray<Scored>,
  direction: ScoreDirection,
): Map<PlayerId, number> | null {
  return rankOn(players, byScore(direction));
}

/**
 * Where each player actually **finished**: the crown first, the total second.
 *
 * The score sheet is not always the last word. On a game with a tie-break, two
 * players level on points are separated by the game's own rule and one of them
 * is recorded the winner — reading the totals alone would call them both first
 * and contradict, on the same screen, the name the app has just crowned.
 *
 * So `isWinner` is the primary key and the total only breaks what it leaves
 * level: a shared victory keeps every crowned player at place 1 (and the next at
 * 3), while a settled tie puts the winner 1st and the player he beat 2nd.
 */
export function finishPlaces(
  players: ReadonlyArray<Scored & { isWinner: boolean }>,
  direction: ScoreDirection,
): Map<PlayerId, number> | null {
  const score = byScore(direction);

  return rankOn(players, (a, b) => {
    if (a.isWinner === b.isWinner) {
      return score(a, b);
    }

    return a.isWinner ? -1 : 1;
  });
}

/**
 * Rank (1 = best) as a relative position in [0, 1], independent of the player
 * count: 0 for the winner, 1 for the last. A lone player maps to 0.
 *
 * ⚠️ The scale runs **down**, not up: the small figure is the good one, the way
 * a placement is spoken (« il finit 2ᵉ »). Every screen showing it says so,
 * because a 0–100 index reads as a score unless told otherwise.
 */
export function relativePosition(rank: number, n: number): number {
  if (n <= 1) {
    return 0;
  }

  return (rank - 1) / (n - 1);
}
