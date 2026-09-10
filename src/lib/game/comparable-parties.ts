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
 * Whether a recorded party can answer a question about time at all — whether it
 * left either of the two trails the figures are divided from: a turn log, or
 * the phase rows that bank the minutes the log never sees.
 *
 * A party with neither is not a party that was quick. Every figure it can
 * produce comes back **0** — and that is provable without knowing the game's
 * phases, which is why the test can live here: with no turns and no phase rows
 * there is nothing for {@link ./party-figures.partyFigures} to sum, whatever it
 * is asked to sum it over.
 *
 * Those zeros are what emptied the bars. `gauge()` scales a figure between the
 * basket's lowest and its highest, so a single keyed-in party pins the low end
 * at 0 for every other evening — and on the keyed-in party itself the value
 * *is* the low end, so its own bars come back empty. The table read that as the
 * app being broken, which it had every reason to: an empty bar means « la plus
 * courte de toutes », and the app was saying it about a party it had never
 * watched.
 *
 * See {@link ./party-figures.wasTimed}, the same question asked of tonight.
 */
function timed(record: GameStatsRecord): boolean {
  return record.turns.length > 0 || (record.phaseTimes?.length ?? 0) > 0;
}

/**
 * The parties tonight is read against: the same game, tonight left out, the
 * ones that were actually timed, and — on a game whose figures really move with
 * the table — the same table size.
 *
 * The size is only applied where the game says it counts, the same flag the
 * records and the player recaps read. Narrowing everywhere looked right and was
 * mostly a way of emptying the panel: on a real history, five parties out of six
 * had **nobody** to be compared with at their own table size, so the bars simply
 * never appeared. A game the flag leaves out is one whose scale barely moves
 * with the seat count, and there the wider basket is both fuller and no less
 * honest.
 *
 * Dropping the untimed parties **shrinks** the basket, which the paragraph above
 * spends its length warning against — the difference is that those parties were
 * never references. A basket narrowed by table size loses evenings that have an
 * answer and simply give it about a different table; a basket holding a keyed-in
 * party keeps something with no answer at all and lets it set the scale.
 */
export function comparableParties(
  records: readonly GameStatsRecord[],
  party: PartyIdentity,
): GameStatsRecord[] {
  return records.filter(r => {
    return (
      r.boardgameId === party.boardgameId &&
      r.gameId !== party.id &&
      (!party.atTableSize || r.players.length === party.playerCount) &&
      timed(r)
    );
  });
}
