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

import type { ScoringSpec, TurnMode } from "@/lib/domain";
import { tracksPlayerTurns } from "./turn-time";

/**
 * Whether the seating means anything at all on this game — asked before
 * {@link canReorderSeats}, which only says whether it is still *safe* to move.
 *
 * Three things read a seat, and a game that does none of them records the
 * seating as row order and nothing else:
 *
 * - **the turn order**, on a game that hands the turn round;
 * - **the pairing**, on a game scored in shared piles (Splito), where the seat
 *   *is* the score — which is why a simultaneous game keeps the correction even
 *   though it never hands a turn to anyone;
 * - **the seat statistics**, where « first to play » is a figure the game keeps.
 *
 * Papayoo and Odin do none of the three: nothing is timed, so no turn is ever
 * recorded, `canReorderSeats` stays true for the whole party and the panel sat
 * there all evening offering to correct an order no screen ever reads.
 */
export function seatingMatters(
  boardgame: Readonly<{
    turnMode: TurnMode;
    timed: boolean;
    trackSeatStats: boolean;
    scoring: Pick<ScoringSpec, "entry"> | null;
  }>,
): boolean {
  return (
    tracksPlayerTurns(boardgame) ||
    boardgame.scoring?.entry === "pairs" ||
    boardgame.trackSeatStats
  );
}

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
