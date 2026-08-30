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

/**
 * 1-based placement per player within one party; `null` if any score is
 * missing. Read as a zero, a missing score would take the first place outright
 * on a game where the smallest total wins — and a half-filled party is not a
 * performance anyway.
 *
 * Ties share the rank of the player above, so two players level for the lead
 * are both 1st and the next one is 3rd.
 */
export function placements(
  players: ReadonlyArray<{ playerId: PlayerId; score: number | null }>,
  direction: ScoreDirection,
): Map<PlayerId, number> | null {
  if (players.some(p => p.score === null)) {
    return null;
  }

  const sorted = [...players].sort((a, b) =>
    direction === "highest"
      ? (b.score as number) - (a.score as number)
      : (a.score as number) - (b.score as number),
  );
  const ranks = new Map<PlayerId, number>();
  let prevScore: number | null = null;
  let prevRank = 0;

  sorted.forEach((p, i) => {
    const rank = prevScore === p.score ? prevRank : i + 1;

    ranks.set(p.playerId, rank);
    prevScore = p.score;
    prevRank = rank;
  });

  return ranks;
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
