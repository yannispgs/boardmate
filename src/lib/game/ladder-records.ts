/**
 * The records of a game counted manche by manche, beyond the score and the
 * plain race (Phase 10):
 *
 * - **the race up the ladder**: the fewest manches anyone needed to clear the
 *   top rung. A speed record like Catan's, counted in manches instead of laps,
 *   and only on a party played to the end without the variant — there the
 *   climb is the same for everybody and says nothing;
 * - **the heaviest manche** (`heaviestStage`): the most points anyone took in a
 *   single manche;
 * - **the smallest win** (`lowestWin`): the smallest total anyone won with;
 * - **the worst manche** (`worstStage`): the fewest points anyone took in a
 *   single manche — the biggest drop, on a game where a manche can cost;
 * - the records of a game played on bets (`betsWon`, `betStreak`), read in
 *   `bet-records.ts`.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type {
  BoardgameId,
  ExtraRecord,
  GameId,
  GameStatsRecord,
  PlayedExtension,
  PlayerId,
  StageScore,
  StageSpec,
} from "@/lib/domain";

import { betStreakMarks, betsWonMarks, type PartyMark } from "./bet-records";
import { ladderRungs } from "./ladder";
import { type SpeedRun, setupKey } from "./speed-records";

/** A finished party, as much of it as a ladder race needs. */
export interface LadderParty {
  gameId: GameId;
  boardgameId: BoardgameId;
  playerIds: readonly PlayerId[];
  scores: readonly StageScore[];
  fixed: boolean;
  extensions: readonly PlayedExtension[];
  winners: readonly PlayerId[];
}

/**
 * A party as a race up the ladder, or `null` when it cannot be one: the game
 * has no ladder, the party ran the variant, or nobody actually cleared the top
 * rung — a party the table stopped early crowned its best climber, but he
 * never finished the race.
 */
export function ladderRunOf(
  stages: StageSpec | null,
  party: LadderParty,
): SpeedRun | null {
  const ladder = stages?.ladder;

  if (ladder === undefined || party.fixed) {
    return null;
  }

  const top = ladder.steps.length;
  const manches = new Set(party.scores.map(s => s.stage)).size;
  const rungs = ladderRungs(
    party.playerIds,
    party.scores,
    Number.POSITIVE_INFINITY,
    top,
    false,
  );
  const finishers = party.winners.filter(id => rungs[id] >= top);

  if (finishers.length === 0) {
    return null;
  }

  return {
    gameId: party.gameId,
    boardgameId: party.boardgameId,
    rounds: manches,
    playerCount: party.playerIds.length,
    target: top,
    setup: setupKey(party.extensions),
    winners: finishers,
    course: "ladder",
  };
}

/** The finished parties of one game, as races up its ladder. */
export function ladderRuns(
  stages: StageSpec | null,
  boardgameId: BoardgameId,
  records: readonly GameStatsRecord[],
): SpeedRun[] {
  return records.flatMap(record => {
    if (record.boardgameId !== boardgameId) {
      return [];
    }

    const run = ladderRunOf(stages, {
      gameId: record.gameId,
      boardgameId: record.boardgameId,
      playerIds: record.players.map(p => p.playerId),
      scores: record.stageScores ?? [],
      fixed: record.ladderFixed === true,
      extensions: record.extensions ?? [],
      winners: record.players.filter(p => p.isWinner).map(p => p.playerId),
    });

    return run === null ? [] : [run];
  });
}

/** One figure a party posted towards an extra record, and who posted it. */
export interface ExtraMark {
  playerId: PlayerId;
  value: number;
  /** The manche it was taken in, for the heaviest one. */
  stage: number | null;
}

/** Which end of an extra record's scale wins. */
export function extraDirection(record: ExtraRecord): "highest" | "lowest" {
  return record === "lowestWin" || record === "worstStage"
    ? "lowest"
    : "highest";
}

/**
 * Every figure one party posted towards an extra record that a party holds on
 * its own — a run of bets (`betStreak`) runs across parties, see
 * {@link extraMarksAcross}.
 */
export function extraMarks(
  record: Exclude<ExtraRecord, "betStreak">,
  party: Readonly<Pick<GameStatsRecord, "players" | "stageScores">>,
): ExtraMark[] {
  if (record === "heaviestStage" || record === "worstStage") {
    return (party.stageScores ?? []).map(s => ({
      playerId: s.playerId,
      value: s.points,
      stage: s.stage,
    }));
  }

  if (record === "betsWon") {
    return betsWonMarks(party);
  }

  return party.players.flatMap(seat =>
    seat.isWinner && seat.score !== null
      ? [{ playerId: seat.playerId, value: seat.score, stage: null }]
      : [],
  );
}

/** Every figure the parties posted towards an extra record, party by party. */
export function extraMarksAcross(
  record: ExtraRecord,
  parties: readonly GameStatsRecord[],
): PartyMark[] {
  if (record === "betStreak") {
    return betStreakMarks(parties);
  }

  return parties.flatMap(party =>
    extraMarks(record, party).map(mark => ({ ...mark, gameId: party.gameId })),
  );
}

/** An extra record the party on screen has just taken. */
export interface ExtraRecordTaken {
  record: ExtraRecord;
  /** The new mark and who set it. */
  mark: ExtraMark;
  /** The mark it beat. */
  previous: number;
}

/**
 * The extra records the party being recorded has just taken.
 *
 * Strict, like every other record: you hold a mark by beating the previous
 * one, not by equalling it, and a first party is nobody's record. Read against
 * the parties of the same game with the same extensions and, on a game whose
 * scale moves with it, the same table size.
 */
export function extraRecordsTaken(
  records: readonly ExtraRecord[],
  party: GameStatsRecord,
  history: readonly GameStatsRecord[],
  bySize: boolean,
): ExtraRecordTaken[] {
  const rivals = history.filter(
    other =>
      other.gameId !== party.gameId &&
      other.boardgameId === party.boardgameId &&
      setupKey(other.extensions ?? []) === setupKey(party.extensions ?? []) &&
      (!bySize || other.players.length === party.players.length),
  );

  return records.flatMap(record => {
    const highest = extraDirection(record) === "highest";
    const beats = (mark: ExtraMark, best: ExtraMark | null) => {
      if (best === null) {
        return true;
      }

      return highest ? mark.value > best.value : mark.value < best.value;
    };
    const pick = (marks: ExtraMark[]) =>
      marks.reduce<ExtraMark | null>(
        (best, mark) => (beats(mark, best) ? mark : best),
        null,
      );
    // Read with the rivals before it, for a run carried over from them.
    const mine = pick(
      extraMarksAcross(record, [...rivals, party]).filter(
        mark => mark.gameId === party.gameId,
      ),
    );
    const before = pick(extraMarksAcross(record, rivals));

    if (mine === null || before === null) {
      return [];
    }

    const beaten = highest
      ? mine.value > before.value
      : mine.value < before.value;
    const { playerId, value, stage } = mine;

    return beaten
      ? [{ record, mark: { playerId, value, stage }, previous: before.value }]
      : [];
  });
}
