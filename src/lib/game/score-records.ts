/**
 * The records a party breaks as it is recorded: a player's own best on the game
 * (`PB`), and the best anyone has ever posted on it (`WR`).
 *
 * Both are read off the parties already in the books, and both are strict: you
 * hold a record by beating the previous one, not by equalling it, and a first
 * party is nobody's record — otherwise everyone would be crowned the first time
 * they sat down. Which end of the scale counts comes from the game itself, so
 * Papayoo's best score is its smallest.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { BoardgameId, GameId, PlayerId, ScoringSpec } from "@/lib/domain";
import type { ScoreDirection } from "./scoring";
import { winnerDirection } from "./scoring";

/** Which record a mark stands for: the player's own best, or the game's. */
export type RecordKind = "personal" | "world";

/** A record the party being recorded has just taken. */
export interface ScoreRecord {
  kind: RecordKind;
  /**
   * The table size the record is held at, for a game whose scores only compare
   * between tables of the same size; `null` when it spans every table.
   */
  playerCount: number | null;
}

/** A party already in the books, reduced to what a record needs of it. */
export interface PastParty {
  gameId: GameId;
  boardgameId: BoardgameId;
  players: ReadonlyArray<{ playerId: PlayerId; score: number | null }>;
}

/** The two letters each record is worn as. */
const SIGIL: Readonly<Record<RecordKind, string>> = {
  personal: "PB",
  world: "WR",
};

/** What the reader is told the mark means, on a game that says so. */
const WORDING: Readonly<Record<RecordKind, string>> = {
  personal: "Meilleur score personnel",
  world: "Record du jeu",
};

/** The mark itself: `PB` / `WR`, carrying the table size when it is held at one. */
export function recordLabel(record: ScoreRecord): string {
  return `${SIGIL[record.kind]}${record.playerCount ?? ""}`;
}

/** The mark spelled out, for the games where it is read at one table size. */
export function recordTitle(record: ScoreRecord): string {
  if (record.playerCount === null) {
    return WORDING[record.kind];
  }

  return `${WORDING[record.kind]} à ${record.playerCount} joueurs`;
}

/** Whether `score` takes the record off `best` — strictly, at the game's end. */
function beats(
  score: number,
  best: number,
  direction: ScoreDirection,
): boolean {
  return direction === "highest" ? score > best : score < best;
}

/** The best of the scores posted so far, at the end of the scale that wins. */
function bestOf(scores: number[], direction: ScoreDirection): number {
  return direction === "highest" ? Math.max(...scores) : Math.min(...scores);
}

/**
 * The records each player of the party being recorded has just taken.
 *
 * `history` is every finished party the app knows of; the ones played on
 * another game, and the party itself, are dropped here. Excluding it by id is
 * enough to keep the comparison honest: every other party in the books was
 * finished before the one ending now.
 *
 * A player holds no record at all when the game says its scores aren't worth
 * comparing (`scoring.trackRecords === false`), and no player holds one on his
 * first party — there is nothing to beat yet.
 *
 * `PB` and `WR` are not read the same way. A personal best belongs to whoever
 * beat his own, win or lose. The game's record is a single figure the party
 * either took or didn't: it goes to the party's `winners` — several only on a
 * shared victory — and never to a runner-up who happened to clear the old mark
 * on the way past. While the leaders are level and the tie unbroken `winners`
 * is empty, and the mark waits with the victory.
 */
export function scoreRecords({
  scoring,
  boardgameId,
  gameId,
  standings,
  winners,
  history,
}: Readonly<{
  scoring: ScoringSpec | null;
  boardgameId: BoardgameId;
  gameId: GameId;
  standings: ReadonlyArray<{ playerId: PlayerId; total: number }>;
  /** Who the table crowned, tie-break resolved; empty while a tie stands. */
  winners: readonly PlayerId[];
  history: readonly PastParty[];
}>): Map<PlayerId, ScoreRecord[]> {
  const marks = new Map<PlayerId, ScoreRecord[]>();

  if (scoring === null || scoring.trackRecords === false) {
    return marks;
  }

  const direction = winnerDirection(scoring.winCondition);
  // On a game whose scale moves with the table, a record is only ever read
  // against tables of the same size — and says so, so « WR4 » can't be mistaken
  // for a figure the whole game answers to.
  const atSize = scoring.playerCountSensitive === true;
  const seats = standings.length;
  const playerCount = atSize ? seats : null;

  const past = history.filter(
    p =>
      p.boardgameId === boardgameId &&
      p.gameId !== gameId &&
      (!atSize || p.players.length === seats),
  );
  const everyScore = past.flatMap(p =>
    p.players.map(x => x.score).filter(isScored),
  );
  // The best of the party being recorded: on a cooperative game the whole table
  // wins together, and only the seat that actually posted the figure has taken
  // the record.
  const top = bestOf(
    standings.map(s => s.total),
    direction,
  );

  for (const standing of standings) {
    const own = past.flatMap(p =>
      p.players
        .filter(x => x.playerId === standing.playerId)
        .map(x => x.score)
        .filter(isScored),
    );
    const records: ScoreRecord[] = [];

    if (
      own.length > 0 &&
      beats(standing.total, bestOf(own, direction), direction)
    ) {
      records.push({ kind: "personal", playerCount });
    }

    if (
      everyScore.length > 0 &&
      winners.includes(standing.playerId) &&
      standing.total === top &&
      beats(standing.total, bestOf(everyScore, direction), direction)
    ) {
      records.push({ kind: "world", playerCount });
    }

    if (records.length > 0) {
      marks.set(standing.playerId, records);
    }
  }

  return marks;
}

/** A seat that was actually scored — an unscored one has nothing to compare. */
function isScored(score: number | null): score is number {
  return score !== null;
}
