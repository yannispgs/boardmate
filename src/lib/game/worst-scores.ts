/**
 * The scores nobody wants to be remembered for, filed under the size of the
 * table that produced them.
 *
 * A total only means something next to the number of players it was collected
 * against: at Papayoo the 250 points of a hand are shared out between everybody
 * at the table, so collecting them all is one chance in three of the pile at
 * three players and one in six at six. Comparing the two would rank the small
 * tables and say nothing about anyone.
 *
 * « Worst » is read off the game's own direction rather than assumed: the wrong
 * end of the range is the highest total when the lowest wins (Papayoo, Odin),
 * and the lowest when the highest wins.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { GameStatsRecord, PlayerId, ScoringSpec } from "@/lib/domain";

import { type ScoreDirection, winnerDirection } from "./scoring";

/** One score, and enough to say whose it was and when. */
export interface WorstScore {
  playerId: PlayerId;
  name: string;
  score: number;
  /** ISO 8601, when the party ended; null when it was never recorded. */
  endedAt: string | null;
}

/**
 * The hall of shame of one table size, or of every party at once when the size
 * has no bearing on the total.
 */
export interface WorstScoreSlice {
  /** The table these were collected at; null when every table is read together. */
  playerCount: number | null;
  /** Worst first, at most as many as were asked for. */
  scores: WorstScore[];
}

/** How many are worth showing per slice: enough to be a podium. */
export const WORST_SCORES_KEPT = 3;

/**
 * Whether the wrong end of this game's range deserves a section of its own.
 *
 * Only where the small score wins. There, a big total is a story the table
 * tells afterwards — the hand nobody could get rid of, the pile that landed on
 * one player. Where the big score wins, the worst total is merely a game played
 * badly: a number with nothing to say, and one already read as the low end of
 * the score distribution.
 *
 * Deliberately derived from the win condition rather than from a flag of its
 * own: any game added later that is won by scoring little walks straight in,
 * with nothing to switch on.
 */
export function tracksWorstScores(
  boardgame: Readonly<{
    scoring: Pick<ScoringSpec, "winCondition"> | null;
  }>,
): boolean {
  return (
    boardgame.scoring !== null &&
    winnerDirection(boardgame.scoring.winCondition) === "lowest"
  );
}

/** Sorts the wrong end of the range first. */
function worstFirst(
  direction: ScoreDirection,
): (a: WorstScore, b: WorstScore) => number {
  return direction === "lowest"
    ? (a, b) => b.score - a.score
    : (a, b) => a.score - b.score;
}

/** The scores of one party, as far as this ranking is concerned. */
function scoresOf(
  record: GameStatsRecord,
  playerId: PlayerId | undefined,
): WorstScore[] {
  return record.players
    .filter(p => p.score !== null && (!playerId || p.playerId === playerId))
    .map(p => ({
      playerId: p.playerId,
      name: p.name,
      score: p.score as number,
      endedAt: record.endedAt,
    }));
}

/** The wrong end of a heap of scores, worst first, cut to a podium. */
function podium(
  scores: readonly WorstScore[],
  direction: ScoreDirection,
  limit: number,
): WorstScore[] {
  return [...scores].sort(worstFirst(direction)).slice(0, limit);
}

/**
 * The heaviest scores of the given parties, cut the way this game compares.
 *
 * `byPlayerCount` splits them by the size of the table, small tables first —
 * the honest reading wherever a total shifts with the seat count. Left off, the
 * parties are read as one, and the single slice carries no table size because
 * there is none to name.
 *
 * Pass a `playerId` for one player's own record: the same reading, narrowed to
 * their lines.
 */
export function worstScoreSlices(
  records: readonly GameStatsRecord[],
  direction: ScoreDirection,
  options: Readonly<{
    playerId?: PlayerId;
    limit?: number;
    byPlayerCount?: boolean;
  }> = {},
): WorstScoreSlice[] {
  const limit = options.limit ?? WORST_SCORES_KEPT;

  // Read as one heap: at most a single slice, and no table size to sort on.
  if (!options.byPlayerCount) {
    const scores = podium(
      records.flatMap(r => scoresOf(r, options.playerId)),
      direction,
      limit,
    );

    return scores.length === 0 ? [] : [{ playerCount: null, scores }];
  }

  const sizes = new Map<number, WorstScore[]>();

  for (const record of records) {
    const count = record.players.length;

    sizes.set(count, [
      ...(sizes.get(count) ?? []),
      ...scoresOf(record, options.playerId),
    ]);
  }

  return [...sizes.entries()]
    .map(([playerCount, scores]) => ({
      playerCount,
      scores: podium(scores, direction, limit),
    }))
    .filter(slice => slice.scores.length > 0)
    .sort((a, b) => a.playerCount - b.playerCount);
}
