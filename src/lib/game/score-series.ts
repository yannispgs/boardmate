import type { PlayerId, ScoreEvent } from "@/lib/domain";

/** A point on a player's score curve: `x` in 0–1 (tour fraction), `score`. */
export interface ScorePoint {
  x: number;
  score: number;
}

export interface PlayerSeries {
  playerId: PlayerId;
  points: ScorePoint[];
}

/**
 * Turns the flat score-event log into one **step** polyline per player for the
 * evolution chart. The x-axis is the tour the change happened in (0–1 of the
 * game's `totalRounds`); each player's line starts at 0, holds its current score
 * across tours without a change (a flat plateau — the stagnation you want to
 * see), jumps on each event, and holds its final score to the right edge.
 * Players with no event stay flat at 0.
 */
export function buildScoreSeries(
  events: ScoreEvent[],
  playerIds: PlayerId[],
  totalRounds: number,
): { series: PlayerSeries[]; maxScore: number } {
  if (events.length === 0) {
    return { series: [], maxScore: 0 };
  }

  const denom = Math.max(1, totalRounds);
  const xOf = (round: number) => Math.min(1, round / denom);
  const maxScore = events.reduce((m, e) => Math.max(m, e.score), 0);

  const series = playerIds.map(playerId => {
    const points: ScorePoint[] = [{ x: 0, score: 0 }];
    let last = 0;

    for (const e of events) {
      if (e.playerId !== playerId) {
        continue;
      }

      const x = xOf(e.round);
      // Hold the previous score up to this tour, then jump — a run of tours
      // without scoring reads as a flat plateau.
      points.push({ x, score: last }, { x, score: e.score });
      last = e.score;
    }

    points.push({ x: 1, score: last });

    return { playerId, points };
  });

  return { series, maxScore: Math.max(1, maxScore) };
}
