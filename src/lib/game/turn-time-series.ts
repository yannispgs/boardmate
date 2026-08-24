import type { GameTurn, PlayerId } from "@/lib/domain";

/** A point on a player's pace curve: their average turn on a given round. */
export interface TimePoint {
  round: number;
  seconds: number;
}

export interface PlayerTimeSeries {
  playerId: PlayerId;
  points: TimePoint[];
}

/**
 * Turns the turn log into one pace line per player — how long their turns took,
 * round by round — for the end-of-game "time evolution" chart. Shows who dragged
 * early vs late (who monopolised the table at the start / the end). Players with
 * no turn get an empty line.
 *
 * A round holds **one point per player**, their **average** turn in it. Most
 * games give a player a single turn per round, so the average is that turn and
 * the curve is unchanged; a game played in generations gives him as many as he
 * likes before passing, and plotting them all put several times on the same
 * abscissa — a line folding back on itself, which is what made the chart
 * unreadable on Terraforming Mars. The average is also the figure that compares:
 * a generation where somebody took six turns is not slower than one where he
 * took two simply because he played more.
 */
export function buildTurnTimeSeries(
  turns: GameTurn[],
  playerIds: PlayerId[],
): { series: PlayerTimeSeries[]; maxSeconds: number; maxRound: number } {
  const maxRound = turns.reduce((m, t) => Math.max(m, t.round), 0);

  const series = playerIds.map(playerId => {
    const mine = turns.filter(t => t.playerId === playerId);
    const rounds = [...new Set(mine.map(t => t.round))].sort((a, b) => a - b);

    const points = rounds.map(round => {
      const played = mine.filter(t => t.round === round);

      return {
        round,
        seconds:
          played.reduce((sum, t) => sum + t.durationS, 0) / played.length,
      };
    });

    return { playerId, points };
  });

  // Read off the averages rather than off the turn log: the curves are drawn
  // from the averages, so a single long turn buried in a generation must not
  // flatten every line against the floor of the chart.
  const maxSeconds = series.reduce(
    (m, s) => s.points.reduce((n, pt) => Math.max(n, pt.seconds), m),
    0,
  );

  return { series, maxSeconds: Math.max(1, maxSeconds), maxRound };
}
