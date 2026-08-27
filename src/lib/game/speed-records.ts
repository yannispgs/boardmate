/**
 * The record a race leaves behind on a game that ends when somebody reaches a
 * score: not the total posted — everyone stops at the same figure, so the total
 * says nothing — but **how few laps of the table it took to get there**.
 *
 * Only one kind of game keeps such a mark, and it names itself: the game stops
 * on a score target **and** the biggest score wins. Odin also stops on a target,
 * but there the small score wins, so crossing the line is what loses you the
 * game — counting the laps would crown whoever collapsed fastest. Nothing is
 * declared per game: any future game built the same way is read the same way.
 *
 * A speed record is deliberately independent of `trackRecords`. Catan silences
 * its score record because the scenario decides the total, and still holds a
 * speed record — the two answer different questions.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type {
  BoardgameId,
  GameId,
  GameStatsRecord,
  PlayedExtension,
  PlayerId,
  ScoringSpec,
} from "@/lib/domain";
import { winnerDirection } from "./scoring";

/**
 * Whether this game's parties are worth timing in laps. See the module note:
 * a race towards a target the highest score takes, and nothing else.
 */
export function tracksSpeedRecord(scoring: ScoringSpec | null): boolean {
  if (scoring?.stopCondition?.type !== "scoreTarget") {
    return false;
  }

  return winnerDirection(scoring.winCondition) === "highest";
}

/** A finished race, reduced to what a speed record needs of it. */
export interface SpeedRun {
  gameId: GameId;
  boardgameId: BoardgameId;
  /** Laps of the table played to reach the target. */
  rounds: number;
  playerCount: number;
  /** The finish line, options and scenario resolved. */
  target: number;
  /** What the party was set up with — see {@link setupKey}. */
  setup: string;
  /** Who reached the target; several only on a shared victory. */
  winners: readonly PlayerId[];
}

/** A party as it stands, before anything has decided whether it is a race. */
export interface RunCandidate {
  gameId: GameId;
  boardgameId: BoardgameId;
  rounds: number;
  /**
   * Whether a turn was ever logged. A party keyed in after the fact has none
   * and never left the first lap: its `rounds` is the column's default, not a
   * figure anybody played, and reading it as one would hand it every record.
   */
  played: boolean;
  playerCount: number;
  /** Null when the party recorded no target — an unknown finish line. */
  target: number | null;
  extensions: readonly PlayedExtension[];
  winners: readonly PlayerId[];
}

/**
 * What a party was set up with, as one comparable handle: the extensions in
 * play order, each with the scenario chosen on it. Empty string for the base
 * game — a basket of its own, not a missing value, since a map laid out by an
 * extension is not the map the base game races on.
 */
export function setupKey(extensions: readonly PlayedExtension[]): string {
  return extensions
    .map(e =>
      e.scenarioName === null ? e.name : `${e.name}/${e.scenarioName}`,
    )
    .join(" + ");
}

/**
 * A party as a race, or `null` when it cannot be one. Three things disqualify
 * it, and each for its own reason: the game keeps no speed record at all, the
 * party was never played through the app (no turn logged), or it recorded no
 * target — two races whose finish lines sat in different places, or in an
 * unknown one, are not the same race.
 *
 * A party nobody won is out too: the mark belongs to whoever reached the
 * target, so there has to be one.
 */
export function speedRunOf(
  scoring: ScoringSpec | null,
  party: RunCandidate,
): SpeedRun | null {
  if (!tracksSpeedRecord(scoring) || !party.played) {
    return null;
  }

  if (party.target === null || party.winners.length === 0) {
    return null;
  }

  return {
    gameId: party.gameId,
    boardgameId: party.boardgameId,
    rounds: party.rounds,
    playerCount: party.playerCount,
    target: party.target,
    setup: setupKey(party.extensions),
    winners: party.winners,
  };
}

/**
 * The finished parties of one game, as races. `records` is every finished party
 * the app knows of; the ones played on another game are dropped here, since a
 * speed record never crosses games.
 */
export function speedRuns(
  scoring: ScoringSpec | null,
  boardgameId: BoardgameId,
  records: readonly GameStatsRecord[],
): SpeedRun[] {
  return records.flatMap(record => {
    if (record.boardgameId !== boardgameId) {
      return [];
    }

    const run = speedRunOf(scoring, {
      gameId: record.gameId,
      boardgameId: record.boardgameId,
      rounds: record.rounds ?? 1,
      played: record.turns.length > 0,
      playerCount: record.players.length,
      target: record.winThreshold ?? null,
      extensions: record.extensions ?? [],
      winners: record.players.filter(p => p.isWinner).map(p => p.playerId),
    });

    return run === null ? [] : [run];
  });
}

/** Whether two races were run on the same course, and so compare at all. */
export function sameCourse(a: SpeedRun, b: SpeedRun): boolean {
  return (
    a.boardgameId === b.boardgameId &&
    a.playerCount === b.playerCount &&
    a.target === b.target &&
    a.setup === b.setup
  );
}

/** A speed record as it is announced: the new mark, and the one it took. */
export interface SpeedRecord {
  /** Laps the party took. */
  rounds: number;
  /** The mark that stood before — what this run had to beat to be one. */
  previous: number;
  playerCount: number;
  target: number;
}

/**
 * The speed record the party being recorded has just taken, or `null`.
 *
 * Strict, exactly like the score records: you hold the mark by beating the
 * previous one, not by equalling it, and **a first race is nobody's record** —
 * there is nothing to beat yet. Announcing a mark being taken and naming the
 * mark to beat are two different questions; this one answers the first.
 */
export function speedRecord(
  run: SpeedRun | null,
  history: readonly SpeedRun[],
): SpeedRecord | null {
  if (run === null) {
    return null;
  }

  const rivals = history.filter(
    other => other.gameId !== run.gameId && sameCourse(run, other),
  );

  if (rivals.length === 0) {
    return null;
  }

  const previous = Math.min(...rivals.map(other => other.rounds));

  if (run.rounds >= previous) {
    return null;
  }

  return {
    rounds: run.rounds,
    previous,
    playerCount: run.playerCount,
    target: run.target,
  };
}

/** « 9 tours à 3 joueurs pour 16 points » — the mark said in full. */
export function speedRecordDetail(
  record: Readonly<Pick<SpeedRecord, "rounds" | "playerCount" | "target">>,
): string {
  const laps = record.rounds > 1 ? "tours" : "tour";

  return `${record.rounds} ${laps} à ${record.playerCount} joueurs pour ${record.target} points`;
}
