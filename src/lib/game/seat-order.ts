/**
 * Correcting the seating of a game in progress, when the table was entered in
 * the wrong order at launch.
 *
 * The seating is only movable while nothing already recorded depends on it. Two
 * things do:
 *
 * - **the turn log** — a sequential game records each turn under the player who
 *   played it, so once a turn is down, the table *did* go round in the order it
 *   was entered; moving the seats afterwards would make them lie about a log
 *   that stays as it was. A simultaneous game (Splito) records rounds with no
 *   owner, so it never contradicts anything, whatever has been played;
 * - **the scores** — on a game scored in shared piles, the seating *is* the
 *   pairing (see `pair-scoring`), so moving a seat re-pairs every pile. That is
 *   why this belongs to a game in progress only: the piles are entered at the
 *   end, so at this point there is nothing to re-derive.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { TurnMode } from "@/lib/domain";

/**
 * Whether the seating of an ongoing game can still be corrected — nothing
 * recorded so far names a seat.
 */
export function canReorderSeats(
  turnMode: TurnMode,
  turnsPlayed: number,
): boolean {
  return turnMode === "simultaneous" || turnsPlayed === 0;
}
