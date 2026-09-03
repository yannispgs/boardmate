/**
 * Which parties of the past a party is read against.
 *
 * One rule, shared by every bar on the end-of-game screen: the tiles of « La
 * partie » and the phase legend both draw a level, and two levels drawn on two
 * different baskets would be two answers to the same question.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { BoardgameId, GameId, GameStatsRecord } from "@/lib/domain";

/** The whole of tonight the rule reads — deliberately not the game itself. */
export interface PartyIdentity {
  id: GameId;
  boardgameId: BoardgameId;
  /** How many sat at the table. */
  playerCount: number;
  /**
   * Whether this game's figures really move with the table size
   * (`playerCountSensitive`), and the comparison should therefore narrow to it.
   */
  atTableSize: boolean;
}

/**
 * The parties tonight is read against: the same game, tonight left out, and —
 * on a game whose figures really move with the table — the same table size.
 *
 * The size is only applied where the game says it counts, the same flag the
 * records and the player recaps read. Narrowing everywhere looked right and was
 * mostly a way of emptying the panel: on a real history, five parties out of six
 * had **nobody** to be compared with at their own table size, so the bars simply
 * never appeared. A game the flag leaves out is one whose scale barely moves
 * with the seat count, and there the wider basket is both fuller and no less
 * honest.
 */
export function comparableParties(
  records: readonly GameStatsRecord[],
  party: PartyIdentity,
): GameStatsRecord[] {
  return records.filter(r => {
    return (
      r.boardgameId === party.boardgameId &&
      r.gameId !== party.id &&
      (!party.atTableSize || r.players.length === party.playerCount)
    );
  });
}
