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

import type { GameStatsRecord, PlayerId } from "@/lib/domain";

import type { ScoreDirection } from "./scoring";

/** One score, and enough to say whose it was and when. */
export interface WorstScore {
  playerId: PlayerId;
  name: string;
  score: number;
  /** ISO 8601, when the party ended; null when it was never recorded. */
  endedAt: string | null;
}

/** The hall of shame of one table size. */
export interface WorstScoreGroup {
  playerCount: number;
  /** Worst first, at most as many as were asked for. */
  scores: WorstScore[];
}

/** How many are worth showing per table size: enough to be a podium. */
export const WORST_SCORES_KEPT = 3;

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

/**
 * The heaviest scores of the given parties, grouped by how many players sat at
 * the table and ordered small tables first. Pass a `playerId` for one player's
 * own record — the same reading, narrowed to their lines.
 */
export function worstScoresByPlayerCount(
  records: readonly GameStatsRecord[],
  direction: ScoreDirection,
  options: Readonly<{ playerId?: PlayerId; limit?: number }> = {},
): WorstScoreGroup[] {
  const limit = options.limit ?? WORST_SCORES_KEPT;
  const groups = new Map<number, WorstScore[]>();

  for (const record of records) {
    const count = record.players.length;

    groups.set(count, [
      ...(groups.get(count) ?? []),
      ...scoresOf(record, options.playerId),
    ]);
  }

  return [...groups.entries()]
    .map(([playerCount, scores]) => ({
      playerCount,
      scores: [...scores].sort(worstFirst(direction)).slice(0, limit),
    }))
    .filter(group => group.scores.length > 0)
    .sort((a, b) => a.playerCount - b.playerCount);
}
