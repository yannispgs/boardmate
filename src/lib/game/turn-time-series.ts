import type { GameTurn, PlayerId } from "@/lib/domain";

/** A point on a player's pace curve: their active time on a given tour. */
export interface TimePoint {
  tour: number;
  seconds: number;
}

export interface PlayerTimeSeries {
  playerId: PlayerId;
  points: TimePoint[];
}

/**
 * Turns the turn log into one pace line per player — their active time on each
 * tour — for the end-of-game "time evolution" chart. Shows who dragged early vs
 * late (who monopolised the table at the start / the end). Players with no turn
 * get an empty line.
 */
export function buildTurnTimeSeries(
  turns: GameTurn[],
  playerIds: PlayerId[],
): { series: PlayerTimeSeries[]; maxSeconds: number; maxTour: number } {
  const maxTour = turns.reduce((m, t) => Math.max(m, t.round), 0);
  const maxSeconds = turns.reduce((m, t) => Math.max(m, t.durationS), 0);

  const series = playerIds.map(playerId => {
    const points = turns
      .filter(t => t.playerId === playerId)
      .sort((a, b) => a.round - b.round)
      .map(t => ({ tour: t.round, seconds: t.durationS }));

    return { playerId, points };
  });

  return { series, maxSeconds: Math.max(1, maxSeconds), maxTour };
}
