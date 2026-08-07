/**
 * Score read against the number of turns actually played.
 *
 * Most games give everyone the same number of turns, so this says nothing. Some
 * end on a random trigger mid-lap — Forêt Mixte stops the moment the third
 * winter card is drawn — and there the last players of the lap simply got one
 * turn fewer than the first ones. Boardgames flag it with `turnCountVaries`.
 *
 * ⚠️ Deliberately an **indicator only**: points rarely accrue linearly (a large
 * part of a Forêt Mixte score comes from end-of-game card combinations, not from
 * the marginal turn), so a player with fewer turns flatters their own ratio.
 * Nothing here ever decides a winner, a rank or a tie-break.
 */

import type { PlayerId } from "@/lib/domain";

/** One participant, reduced to what a pace reading needs. */
export interface PacePlayer {
  playerId: PlayerId;
  name: string;
  /** Final score, or `null` when the game recorded none. */
  score: number | null;
  /** Turns this player actually took. */
  turnCount: number;
}

/** A player's score, their turns, and the rate between the two. */
export interface PlayerPace extends PacePlayer {
  /** Points per turn played, or `null` without a score or without a turn. */
  perTurn: number | null;
}

/**
 * Two players the end of the game may have separated unfairly: `behind` scored
 * less than `ahead` *and* played fewer turns, and their own average says one
 * more turn would have taken them past.
 */
export interface NearMiss {
  behind: PacePlayer;
  ahead: PacePlayer;
  /** What that extra turn was worth, at the player's own average (rounded). */
  gain: number;
}

/** Points per turn played — `null` when either half of the ratio is missing. */
export function pointsPerTurn(player: PacePlayer): number | null {
  if (player.score === null || player.turnCount === 0) {
    return null;
  }

  return player.score / player.turnCount;
}

/**
 * A rate as it reads on screen: one decimal, French comma, and a dash when
 * there is no rate to show. One decimal because the whole point is to separate
 * players raw scores put level — integers would hide that.
 */
export function formatPerTurn(perTurn: number | null): string {
  if (perTurn === null) {
    return "—";
  }

  return perTurn.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Every player with their rate, best score first. */
export function scorePace(players: PacePlayer[]): PlayerPace[] {
  return [...players]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map(p => ({ ...p, perTurn: pointsPerTurn(p) }));
}

/**
 * The « dommage pour X » cases: for each pair adjacent in the final ranking,
 * whether the trailing player both **played fewer turns** and would have gone
 * past on one more, at their own average pace. Only adjacent pairs, so a game
 * never spawns a paragraph of what-ifs.
 *
 * Strictly past, not level: the point is that the order might have flipped.
 */
export function nearMisses(players: PacePlayer[]): NearMiss[] {
  const ranked = scorePace(players);
  const misses: NearMiss[] = [];

  for (let i = 0; i < ranked.length - 1; i++) {
    const ahead = ranked[i];
    const behind = ranked[i + 1];

    if (
      ahead.score === null ||
      behind.score === null ||
      behind.turnCount >= ahead.turnCount ||
      behind.score >= ahead.score
    ) {
      continue;
    }

    const gain = Math.round(behind.perTurn ?? 0);

    if (behind.score + gain > ahead.score) {
      misses.push({ behind, ahead, gain });
    }
  }

  return misses;
}
