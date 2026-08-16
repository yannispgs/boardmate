/**
 * What a *set* of manche-counted games (Odin) says, across parties.
 *
 * The end-of-game panel uses it to place the party that just finished against
 * the ones before it — « 9 manches, contre 7,4 en moyenne » — and the stats page
 * uses the same figures as its headline tiles, plus the two breakdowns that only
 * mean anything over several parties: who goes out most often, and how heavy a
 * manche usually is.
 */

import type { GameStatsRecord, PlayerId, StageScore } from "@/lib/domain";

/** The manches of one recorded game (empty for a game that had none). */
function stageScoresOf(record: GameStatsRecord): StageScore[] {
  return record.stageScores ?? [];
}

/** How many manches a recorded game lasted. */
function stageCountOf(record: GameStatsRecord): number {
  return new Set(stageScoresOf(record).map(s => s.stage)).size;
}

/** The reference figures a single party is read against. */
export interface TallyAverages {
  /** Parties these averages are drawn from. */
  games: number;
  /** Manches per party. */
  avgStages: number;
  /** The winning total, averaged; null when no party recorded one. */
  avgWinnerScore: number | null;
  /** Points the table picks up in a manche, averaged. */
  avgPointsPerStage: number;
}

/**
 * The averages over the given parties, or `null` when there is none to average
 * — a first party of Odin has nothing to be compared with, and saying so is
 * better than comparing it with itself.
 */
export function computeTallyAverages(
  records: readonly GameStatsRecord[],
): TallyAverages | null {
  const played = records.filter(r => stageCountOf(r) > 0);

  if (played.length === 0) {
    return null;
  }

  const stages = played.reduce((sum, r) => sum + stageCountOf(r), 0);
  const points = played.reduce(
    (sum, r) =>
      sum + stageScoresOf(r).reduce((s, score) => s + score.points, 0),
    0,
  );
  const winners = played
    .flatMap(r => r.players)
    .filter(p => p.isWinner)
    .map(p => p.score)
    .filter((score): score is number => score !== null);

  return {
    games: played.length,
    avgStages: stages / played.length,
    avgWinnerScore:
      winners.length === 0
        ? null
        : winners.reduce((sum, s) => sum + s, 0) / winners.length,
    avgPointsPerStage: points / stages,
  };
}

/** One player's record at going out, across parties. */
export interface TallyExitStat {
  playerId: PlayerId;
  name: string;
  /** Manches they sat through. */
  stages: number;
  /** Of those, the ones they closed at 0. */
  exits: number;
  /** Share of manches they went out on (0–1). */
  rate: number;
  /** Mean cost of a manche they didn't go out on; null when they always did. */
  avgCaught: number | null;
}

interface ExitAccumulator {
  name: string;
  stages: number;
  exits: number;
  caught: number;
  caughtPoints: number;
}

/**
 * Who goes out, and what it costs the others, across the given parties. Sorted
 * by rate, best first — going out is the whole point of the game, so the player
 * who does it most often heads the table.
 */
export function computeTallyExits(
  records: readonly GameStatsRecord[],
): TallyExitStat[] {
  const acc = new Map<PlayerId, ExitAccumulator>();

  for (const record of records) {
    const names = new Map(record.players.map(p => [p.playerId, p.name]));

    for (const score of stageScoresOf(record)) {
      const line = acc.get(score.playerId) ?? {
        /* c8 ignore next -- `?? "?"` guards a score whose player left the table */
        name: names.get(score.playerId) ?? "?",
        stages: 0,
        exits: 0,
        caught: 0,
        caughtPoints: 0,
      };

      line.stages += 1;

      if (score.points === 0) {
        line.exits += 1;
      } else {
        line.caught += 1;
        line.caughtPoints += score.points;
      }

      acc.set(score.playerId, line);
    }
  }

  return [...acc.entries()]
    .map(([playerId, line]) => ({
      playerId,
      name: line.name,
      stages: line.stages,
      exits: line.exits,
      rate: line.exits / line.stages,
      avgCaught: line.caught === 0 ? null : line.caughtPoints / line.caught,
    }))
    .sort((a, b) => b.rate - a.rate);
}

/** One bar of the manche-cost distribution. */
export interface TallyPointsBar {
  /** Lowest cost this bar counts. */
  points: number;
  /** Highest cost it counts — the same number when it counts a single cost. */
  upTo: number;
  count: number;
}

/**
 * Bars a chart can still be read at on a phone. A game paying in single points
 * (Odin: 9 a manche) gets one bar per point; a game paying in hundreds
 * (Papayoo: 250 shared out) would get two hundred and fifty of them, so it gets
 * ranges instead.
 */
const MAX_BARS = 10;

/**
 * How wide a bar has to be for `maxPoints` to fit in {@link MAX_BARS} of them.
 * `1` — one bar per point — for every game small enough, which is what the
 * chart did before any game was big enough to need this.
 */
export function tallyPointsBucket(maxPoints: number | null): number {
  if (maxPoints === null || maxPoints <= MAX_BARS) {
    return 1;
  }

  return Math.ceil(maxPoints / MAX_BARS);
}

/**
 * How often each manche cost was written down, from 0 up to the heaviest ever
 * taken. Every value in between gets its bar, empty ones included, so the shape
 * of the distribution shows rather than the bars merely being listed.
 *
 * `bucket` groups costs into ranges of that width for a game whose manches are
 * counted in hundreds. **0 always keeps its own bar**, whatever the width: a
 * manche taken at no cost is not a cheap manche, it is the one thing the table
 * is playing for, and burying it in a « 0 à 24 » range would hide it.
 */
export function tallyPointsHistogram(
  records: readonly GameStatsRecord[],
  bucket = 1,
): TallyPointsBar[] {
  const counts = new Map<number, number>();
  let max = 0;

  for (const record of records) {
    for (const score of stageScoresOf(record)) {
      counts.set(score.points, (counts.get(score.points) ?? 0) + 1);
      max = Math.max(max, score.points);
    }
  }

  if (counts.size === 0) {
    return [];
  }

  return pointRanges(max, bucket).map(range => ({
    ...range,
    count: countIn(counts, range),
  }));
}

/** The ranges the bars stand for: zero on its own, then bands of `bucket`. */
function pointRanges(
  max: number,
  bucket: number,
): Array<{ points: number; upTo: number }> {
  const ranges = [{ points: 0, upTo: 0 }];

  for (let from = 1; from <= max; from += bucket) {
    ranges.push({ points: from, upTo: from + bucket - 1 });
  }

  return ranges;
}

/** How many manches cost something inside that range. */
function countIn(
  counts: ReadonlyMap<number, number>,
  range: Readonly<{ points: number; upTo: number }>,
): number {
  let total = 0;

  for (const [points, count] of counts) {
    if (points >= range.points && points <= range.upTo) {
      total += count;
    }
  }

  return total;
}
