/**
 * Pair scoring (Splito): the players sit in a circle and every pile of points
 * is SHARED by two neighbours. A player's final score is the *product* of the
 * two piles flanking his seat — so each pile counts twice, once for each of its
 * owners, and a pile left at zero wipes out both of them.
 *
 * The official score sheet says exactly this: one bordered cell per player,
 * with an oval straddling each of its two borders and a × underneath.
 *
 * Pure: no vendor types, unit-tested.
 */
import type { PlayerId } from "@/lib/domain";

/** One shared pile, sitting between two neighbouring seats. */
export interface Pile {
  key: string;
  /** The two seats it flanks, in seat order (the seat before, then after). */
  between: [PlayerId, PlayerId];
}

/** A player's two piles and the product they make. */
export interface PairScore {
  left: number;
  right: number;
  total: number;
}

/** Breakdown keys stored on `game_players.score_breakdown` for a pair game. */
export const PAIR_LEFT = "left";
export const PAIR_RIGHT = "right";

/** Stable key of the pile sitting after seat `index`, going round the circle. */
export function pileKey(index: number): string {
  return `pile${index}`;
}

/**
 * The circle's piles, in seat order: pile `i` sits between seat `i` and the
 * next seat round, and the last one closes the circle back onto the first — so
 * there are as many piles as players. A lone player shares nothing with nobody,
 * so he gets no pile at all.
 */
export function pilesFor(seats: PlayerId[]): Pile[] {
  if (seats.length < 2) {
    return [];
  }

  return seats.map((id, i) => ({
    key: pileKey(i),
    between: [id, seats[(i + 1) % seats.length]],
  }));
}

/**
 * The keys of the two piles flanking a seat: the one closing onto it from the
 * previous seat, then the one it opens towards the next. `null` for a player
 * who isn't seated in this circle.
 */
export function pilesOfSeat(
  seats: PlayerId[],
  playerId: PlayerId,
): { left: string; right: string } | null {
  const index = seats.indexOf(playerId);

  if (index < 0 || seats.length < 2) {
    return null;
  }

  return {
    left: pileKey((index - 1 + seats.length) % seats.length),
    right: pileKey(index),
  };
}

/**
 * Every player's score, from the piles entered around the table. A pile nobody
 * filled counts as 0 — and therefore zeroes both its owners, which is the
 * game's own rule rather than a gap to paper over.
 */
export function scorePiles(
  seats: PlayerId[],
  piles: Record<string, number>,
): Record<PlayerId, PairScore> {
  const scores: Record<PlayerId, PairScore> = {};

  for (const id of seats) {
    const flanking = pilesOfSeat(seats, id);
    const left = flanking ? (piles[flanking.left] ?? 0) : 0;
    const right = flanking ? (piles[flanking.right] ?? 0) : 0;

    scores[id] = { left, right, total: left * right };
  }

  return scores;
}

/** How many of the circle's piles are still unfilled. */
export function pilesRemaining(
  seats: PlayerId[],
  piles: Record<string, number>,
): number {
  return pilesFor(seats).filter(p => piles[p.key] === undefined).length;
}

/**
 * A player's stored breakdown for a pair game, ready for
 * `game_players.score_breakdown`.
 */
export function pairBreakdown(score: PairScore): Record<string, number> {
  return { [PAIR_LEFT]: score.left, [PAIR_RIGHT]: score.right };
}

/**
 * Reads a stored breakdown back into the two piles, for the score recap.
 * `null` when the game wasn't scored that way (nothing to multiply).
 */
export function readPairBreakdown(
  breakdown: Record<string, number> | null,
): { left: number; right: number } | null {
  const left = breakdown?.[PAIR_LEFT];
  const right = breakdown?.[PAIR_RIGHT];

  if (typeof left !== "number" || typeof right !== "number") {
    return null;
  }

  return { left, right };
}
