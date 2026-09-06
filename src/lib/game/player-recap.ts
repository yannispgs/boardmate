import type { BoardgameId, GameId, PlayerId, ScoringSpec } from "@/lib/domain";
import { finishPlaces, relativePosition } from "./placement";
import type { ScoreDirection } from "./scoring";
import { winnerDirection } from "./scoring";
import { tracksSpeedRecord } from "./speed-records";
import { timeShareIndex } from "./turn-time";

/**
 * What a player's evening looked like **against his own past evenings on the
 * same game** — the second half of the end-of-game screen, next to the party's
 * own figures.
 *
 * The unit is deliberately one player against himself, not against the table:
 * the table is already ranked by the score sheet, and « 82 points » says
 * nothing until you know he usually makes 60. Every measure here is therefore
 * a value placed among the values that player has produced before, and nothing
 * in this file ever compares two players.
 */

/** Which past parties a recap is read against. */
export type RecapScope = "all" | "sameTable";

/** The measures a party can place a player on. */
export type MeasureKey =
  | "score"
  | "placement"
  | "timeShare"
  | "avgTurn"
  | "speed";

/** A party reduced to what a recap reads on it — tonight's, or a past one. */
export interface RecapParty {
  gameId: GameId;
  boardgameId: BoardgameId;
  /** The finish line this party was played to, when it raced towards one. */
  winThreshold: number | null;
  /** Laps of the table played, which is what a race is measured in. */
  rounds: number;
  players: ReadonlyArray<{
    playerId: PlayerId;
    score: number | null;
    isWinner: boolean;
  }>;
  turns: ReadonlyArray<{ playerId: PlayerId; durationS: number }>;
}

/** One figure of tonight, placed among the same figure of the parties before. */
export interface RecapMeasure {
  key: MeasureKey;
  /** Tonight's figure. */
  value: number;
  /** The same figure on the parties before tonight, in no particular order. */
  past: number[];
  /**
   * Which end of the scale is the good one, or `null` when neither is. A share
   * of the table's time is a fact about an evening, not a performance: calling
   * the small figure the good one would tell a player who thought long that he
   * played badly.
   */
  direction: ScoreDirection | null;
  /**
   * Where tonight stands among `past` + tonight, 1 = best, ties sharing a rank.
   * Null exactly when `direction` is null — an unordered measure has no best.
   */
  rank: number | null;
  /**
   * A fixed figure this measure is read against, drawn on the bar — or null for
   * the measures that have none.
   *
   * Only a normalised one can have it: 100 means « sa part » on every party of
   * every table size, which is precisely what normalising bought. A score or an
   * average turn has no such figure — 82 points is neutral on one game and
   * excellent on the next.
   */
  anchor: number | null;
}

/** Everything the card and its detail need about one player's evening. */
export interface PlayerRecap {
  playerId: PlayerId;
  name: string;
  /**
   * Where he finished tonight, 1 = won, ties sharing a place — or `null` when
   * the party ranks nobody (a cooperative game, a sheet left half-filled).
   * This is the one figure in this file that reads across the table rather than
   * against a player's own past, and it exists only to order the section.
   *
   * The crown comes before the total (see {@link finishPlaces}): a tie the game
   * settled has one winner, not two.
   */
  place: number | null;
  /** Parties before tonight this recap reads on — 0 on a first evening. */
  parties: number;
  measures: RecapMeasure[];
}

/** The seconds a player spent at the table, summed over his turns. */
function timeOf(party: RecapParty, playerId: PlayerId): number {
  let total = 0;

  for (const turn of party.turns) {
    if (turn.playerId === playerId) {
      total += turn.durationS;
    }
  }

  return total;
}

/** How many turns a player took — the denominator of his average turn. */
function turnsOf(party: RecapParty, playerId: PlayerId): number {
  let count = 0;

  for (const turn of party.turns) {
    if (turn.playerId === playerId) {
      count += 1;
    }
  }

  return count;
}

/**
 * His share of the table's time as an index normalised by table size, or null
 * when nothing was timed — see {@link timeShareIndex}.
 *
 * The normalisation is what makes the measure comparable at all here, because
 * nothing else narrows the history to one table size: under the « toutes les
 * parties » scope, {@link historyFor} keeps every party of the boardgame
 * whatever its head count, and a raw percentage placed among raw percentages
 * would rank the size of the tables he sat at.
 */
function timeShare(party: RecapParty, playerId: PlayerId): number | null {
  let total = 0;

  for (const turn of party.turns) {
    total += turn.durationS;
  }

  return timeShareIndex(timeOf(party, playerId), total, party.players.length);
}

/** His average turn in seconds, or null when he took no turn. */
function avgTurn(party: RecapParty, playerId: PlayerId): number | null {
  const count = turnsOf(party, playerId);

  if (count === 0) {
    return null;
  }

  return timeOf(party, playerId) / count;
}

/**
 * His placement on the 0–100 scale used everywhere else on the app (0 = he won,
 * 100 = he finished last), or null when the party ranks nobody — a half-filled
 * sheet does, and so does an evening he simply wasn't at.
 *
 * Read on {@link finishPlaces}, so a tie-break counts: the player the table
 * crowned gets the 0. Anything else would print a 0 next to a silver name.
 */
function placement(
  party: RecapParty,
  playerId: PlayerId,
  direction: ScoreDirection,
): number | null {
  const rank = finishPlaces(party.players, direction)?.get(playerId);

  if (rank === undefined) {
    return null;
  }

  return relativePosition(rank, party.players.length) * 100;
}

/** The score he put on the sheet, or null when that sheet holds none for him. */
function scoreOf(party: RecapParty, playerId: PlayerId): number | null {
  const seat = party.players.find(p => p.playerId === playerId);

  return seat?.score ?? null;
}

/** Whether the table crowned him. */
function won(party: RecapParty, playerId: PlayerId): boolean {
  return party.players.some(p => p.playerId === playerId && p.isWinner);
}

/**
 * The laps he took to reach the finish line, but **only on a party he won**:
 * on a race, the number of laps is a time only for whoever crossed the line —
 * for everyone else it is simply when the winner stopped the game.
 */
function speedOf(party: RecapParty, playerId: PlayerId): number | null {
  if (!won(party, playerId)) {
    return null;
  }

  return party.rounds;
}

/** Ranks `value` among `past` + itself, 1 = best, ties sharing a rank. */
function rankAmong(
  value: number,
  past: readonly number[],
  direction: ScoreDirection,
): number {
  let better = 0;
  const isBetter = (a: number) => {
    return direction === "highest" ? a > value : a < value;
  };

  for (const p of past) {
    if (isBetter(p)) {
      better += 1;
    }
  }

  return better + 1;
}

/** The fixed figure each measure is read against, for the ones that have one. */
const ANCHORS: Partial<Record<MeasureKey, number>> = {
  timeShare: 100,
};

/** Builds one measure, or null when tonight produced no figure for it. */
function measureOf(
  key: MeasureKey,
  value: number | null,
  past: readonly (number | null)[],
  direction: ScoreDirection | null,
): RecapMeasure | null {
  if (value === null) {
    return null;
  }

  const kept = past.filter((p): p is number => p !== null);

  return {
    key,
    value,
    past: kept,
    direction,
    rank: direction === null ? null : rankAmong(value, kept, direction),
    anchor: ANCHORS[key] ?? null,
  };
}

/** What the boardgame decides about the measures a recap can carry. */
export interface RecapSetup {
  scoring: ScoringSpec | null;
  /** Whether the game hands a timed turn from one player to the next. */
  timed: boolean;
}

/**
 * The past parties a player is read against: the same boardgame, never
 * tonight's own party, and — under the « same table » scope — only the evenings
 * played at the same number of players.
 */
function historyFor(
  tonight: RecapParty,
  history: readonly RecapParty[],
  scope: RecapScope,
): RecapParty[] {
  return history.filter(party => {
    if (party.gameId === tonight.gameId) {
      return false;
    }

    if (party.boardgameId !== tonight.boardgameId) {
      return false;
    }

    return scope === "all" || party.players.length === tonight.players.length;
  });
}

/**
 * How many of those parties a player actually sat at — the figure printed under
 * his name. The measures themselves need no such filter: an evening he wasn't
 * at produces no score, no placement and no turn, so it drops out on its own.
 */
function partiesOf(parties: readonly RecapParty[], playerId: PlayerId): number {
  return parties.filter(party => {
    return party.players.some(p => p.playerId === playerId);
  }).length;
}

/**
 * The parties a **speed** measure reads on: his past victories on the same
 * finish line. A race to 10 and a race to 15 are not the same race, so their
 * lap counts never sit on the same scale — the same rule the speed record
 * itself applies (see {@link tracksSpeedRecord}).
 */
function sameFinishLine(
  parties: readonly RecapParty[],
  tonight: RecapParty,
): RecapParty[] {
  return parties.filter(party => {
    return party.winThreshold === tonight.winThreshold;
  });
}

/** Builds the measures of one player, in the order they are read on screen. */
function measuresOf(
  tonight: RecapParty,
  before: readonly RecapParty[],
  playerId: PlayerId,
  setup: RecapSetup,
): RecapMeasure[] {
  const measures: RecapMeasure[] = [];
  const direction =
    setup.scoring === null ? null : winnerDirection(setup.scoring.winCondition);
  const add = (measure: RecapMeasure | null) => {
    if (measure !== null) {
      measures.push(measure);
    }
  };

  if (direction !== null) {
    add(
      measureOf(
        "score",
        scoreOf(tonight, playerId),
        before.map(p => scoreOf(p, playerId)),
        direction,
      ),
    );
    add(
      measureOf(
        "placement",
        placement(tonight, playerId, direction),
        before.map(p => placement(p, playerId, direction)),
        "lowest",
      ),
    );
  }

  if (setup.timed) {
    add(
      measureOf(
        "timeShare",
        timeShare(tonight, playerId),
        before.map(p => timeShare(p, playerId)),
        null,
      ),
    );
    add(
      measureOf(
        "avgTurn",
        avgTurn(tonight, playerId),
        before.map(p => avgTurn(p, playerId)),
        null,
      ),
    );
  }

  if (tracksSpeedRecord(setup.scoring)) {
    const races = sameFinishLine(before, tonight);

    add(
      measureOf(
        "speed",
        speedOf(tonight, playerId),
        races.map(p => speedOf(p, playerId)),
        "lowest",
      ),
    );
  }

  return measures;
}

/**
 * One recap per player of tonight's party, **the winner first**.
 *
 * Seating order was the order the score sheet is filled in, not the order the
 * evening is told in: the first thing anybody looks for at the end of a game is
 * who won, and finding him third because he sat third is a small search nobody
 * should have to do. A party that ranks nobody — a cooperative game, a sheet
 * left half-filled — keeps the seating order, since there is no other.
 *
 * `history` is every finished party in the books — tonight's included, since a
 * game that has just ended is already recorded; it is filtered out by id rather
 * than by trusting the caller to have removed it.
 */
export function playerRecaps({
  tonight,
  history,
  names,
  setup,
  scope,
}: Readonly<{
  tonight: RecapParty;
  history: readonly RecapParty[];
  /** Display name per player, since a party carries only ids. */
  names: ReadonlyMap<PlayerId, string>;
  setup: RecapSetup;
  scope: RecapScope;
}>): PlayerRecap[] {
  const parties = historyFor(tonight, history, scope);
  const direction =
    setup.scoring === null ? null : winnerDirection(setup.scoring.winCondition);
  const places =
    direction === null ? null : finishPlaces(tonight.players, direction);

  const recaps = tonight.players.map(player => {
    return {
      playerId: player.playerId,
      name: names.get(player.playerId) ?? "",
      place: places?.get(player.playerId) ?? null,
      parties: partiesOf(parties, player.playerId),
      measures: measuresOf(tonight, parties, player.playerId, setup),
    };
  });

  // Stable, so an unranked party — every place null — comes out in the order it
  // went in, which is the seating order.
  return recaps.sort((a, b) => {
    return (
      (a.place ?? Number.POSITIVE_INFINITY) -
      (b.place ?? Number.POSITIVE_INFINITY)
    );
  });
}

/**
 * Whether these recaps have anything to place tonight **among**.
 *
 * The section is a comparison and nothing else: on a first evening every figure
 * stands alone, and what happened is already on the score sheet. Rather than
 * show a column of lone dots, the screen leaves it out.
 */
export function hasComparablePast(recaps: readonly PlayerRecap[]): boolean {
  return recaps.some(recap => {
    return recap.measures.some(measure => measure.past.length > 0);
  });
}

/** How many past parties a table-size comparison needs before it says anything. */
export const MIN_SAME_TABLE_PARTIES = 2;

/**
 * Whether the « same number of players » toggle is worth showing at all.
 *
 * Two conditions, both the owner's: the game must be one whose scale actually
 * moves with the table (`playerCountSensitive` — Papayoo's total is always 250,
 * so its average falls from 83 at three to 31 at eight), and somebody at the
 * table must have {@link MIN_SAME_TABLE_PARTIES} evenings at this size to be
 * placed among. A toggle that empties every distribution is a trap, not an
 * option.
 */
export function canCompareByTable(
  tonight: RecapParty,
  history: readonly RecapParty[],
  setup: RecapSetup,
): boolean {
  if (setup.scoring?.playerCountSensitive !== true) {
    return false;
  }

  const parties = historyFor(tonight, history, "sameTable");

  return tonight.players.some(player => {
    return partiesOf(parties, player.playerId) >= MIN_SAME_TABLE_PARTIES;
  });
}
