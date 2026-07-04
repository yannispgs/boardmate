import type { PlayerId, ScoreEvent } from "@/lib/domain";

/** A point on a player's score curve: `x` in 0–1 (event order), `score`. */
export interface ScorePoint {
  x: number;
  score: number;
}

export interface PlayerSeries {
  playerId: PlayerId;
  points: ScorePoint[];
}

/**
 * Turns the flat score-event log into one polyline per player for the evolution
 * chart. The x-axis is event order (0–1); each player's line starts at 0, steps
 * through their events, and holds its final score to the right edge — so lines
 * are comparable and "led early then caught" is visible. Players with no event
 * stay flat at 0.
 */
export function buildScoreSeries(
  events: ScoreEvent[],
  playerIds: PlayerId[],
): { series: PlayerSeries[]; maxScore: number } {
  if (events.length === 0) {
    return { series: [], maxScore: 0 };
  }

  const lastIndex = events.length - 1;
  const xOf = (i: number) => (lastIndex === 0 ? 1 : i / lastIndex);
  const maxScore = events.reduce((m, e) => Math.max(m, e.score), 0);

  const series = playerIds.map(playerId => {
    const points: ScorePoint[] = [{ x: 0, score: 0 }];
    let last = 0;

    events.forEach((e, i) => {
      if (e.playerId === playerId) {
        points.push({ x: xOf(i), score: e.score });
        last = e.score;
      }
    });

    if (points[points.length - 1].x < 1) {
      points.push({ x: 1, score: last });
    }

    return { playerId, points };
  });

  return { series, maxScore: Math.max(1, maxScore) };
}
