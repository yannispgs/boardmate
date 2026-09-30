/**
 * Correcting the scores of a party already in the books.
 *
 * The entry itself is the one « Ajouter une partie terminée » uses — totals, a
 * category grid or shared piles — opened on what was recorded instead of on
 * blanks. What lives here is what that form never had to know: which parties
 * can be corrected this way, how the recorded scores are laid back into it, and
 * whether the tie-break once settled still describes the corrected party.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type {
  Boardgame,
  PlayerId,
  ScoringSpec,
  TieBreakRecord,
} from "@/lib/domain";
import { pilesFromBreakdowns, readPairBreakdown } from "./pair-scoring";
import { derivedKeys, scoreDirectionOf } from "./scoring";

/**
 * Whether a finished party's scores can be corrected by re-typing them.
 *
 * Not when there is no score at all, nor when part of the total was counted
 * elsewhere as the game went on — Odin's manches, Wingspan's round goals: those
 * figures live in their own rows, and a total typed over them here would stop
 * agreeing with the lines it is supposed to add up.
 */
export function scoresCorrectable(
  boardgame: Pick<Boardgame, "scoring" | "stages">,
): boolean {
  const scoring = boardgame.scoring;

  if (scoring === null) {
    return false;
  }

  if (boardgame.stages?.advance === "manual") {
    return false;
  }

  return !(
    scoring.entry === "categories" &&
    scoring.sheet &&
    derivedKeys(scoring.sheet, "stageGoals").length > 0
  );
}

/** One recorded seat, as the correction reads it back. */
export interface RecordedSeat {
  playerId: PlayerId;
  score: number | null;
  scoreBreakdown: Record<string, number> | null;
}

/** The correction form's starting state: what was recorded, typed back in. */
export interface CorrectionSeed {
  /** The detail when the party kept it for every player, the totals if not. */
  entryMode: "total" | "detail";
  totals: Record<string, string>;
  catRaw: Record<string, Record<string, string>>;
  piles: Record<string, number>;
}

/**
 * Lays the recorded scores back into the entry, seats in seat order. The
 * detail is offered only when every player has one: a party added from its
 * totals alone has no grid to reopen, and a half-filled one would read its
 * gaps as zeros.
 */
export function correctionSeed(
  scoring: ScoringSpec,
  seats: readonly RecordedSeat[],
): CorrectionSeed {
  const totals = Object.fromEntries(
    seats.map(s => [s.playerId, s.score === null ? "" : String(s.score)]),
  );

  if (
    scoring.entry === "pairs" &&
    seats.every(s => readPairBreakdown(s.scoreBreakdown) !== null)
  ) {
    return {
      entryMode: "detail",
      totals,
      catRaw: {},
      piles: pilesFromBreakdowns(seats.map(s => s.scoreBreakdown)),
    };
  }

  if (
    scoring.entry === "categories" &&
    seats.every(s => s.scoreBreakdown !== null)
  ) {
    return {
      entryMode: "detail",
      totals,
      catRaw: Object.fromEntries(
        seats.map(s => [
          s.playerId,
          Object.fromEntries(
            // Every seat has one: checked just above.
            Object.entries(s.scoreBreakdown as Record<string, number>).map(
              ([key, value]) => [key, String(value)],
            ),
          ),
        ]),
      ),
      piles: {},
    };
  }

  return { entryMode: "total", totals, catRaw: {}, piles: {} };
}

/**
 * The tie-break once settled, if it still describes the corrected party — or
 * null. It tells how a group level on the best score was separated; it stays
 * true only while that same group is still level on that same score and the
 * same players are still crowned. Any other correction makes it a story about
 * a party that no longer exists.
 */
export function keptTieBreak(
  record: TieBreakRecord | null,
  scoring: ScoringSpec,
  before: Readonly<Record<string, number | null>>,
  after: Readonly<Record<string, number>>,
  winnersBefore: readonly PlayerId[],
  winnersAfter: readonly PlayerId[],
): TieBreakRecord | null {
  if (record === null) {
    return null;
  }

  const sameWinners =
    winnersBefore.length === winnersAfter.length &&
    winnersBefore.every(id => winnersAfter.includes(id));
  const sameTied = record.tied.every(id => before[id] === after[id]);
  const top = topGroup(after, scoreDirectionOf(scoring));
  const sameGroup =
    top.length === record.tied.length &&
    top.every(id => record.tied.includes(id));

  return sameWinners && sameTied && sameGroup ? record : null;
}

/** The players sharing the best score, whichever end the game calls best. */
function topGroup(
  scores: Readonly<Record<string, number>>,
  direction: "highest" | "lowest",
): PlayerId[] {
  const values = Object.values(scores);
  const best =
    direction === "highest" ? Math.max(...values) : Math.min(...values);

  return Object.keys(scores)
    .filter(id => scores[id] === best)
    .map(id => id as PlayerId);
}

/**
 * Who is crowned before anybody touches the choice: the one leader when the
 * corrected sheet names one, else whoever was crowned before and is still among
 * the leaders — a correction that leaves the level group alone leaves the table's
 * old decision standing rather than asking for it again.
 */
export function correctedWinners(
  asked: boolean,
  preselected: readonly PlayerId[],
  previous: readonly PlayerId[],
  candidates: readonly PlayerId[],
): PlayerId[] {
  if (!asked) {
    return [...preselected];
  }

  return previous.filter(id => candidates.includes(id));
}
