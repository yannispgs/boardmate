/**
 * The records of a game played on bets (Luz), beyond the score:
 *
 * - **the most bets won in a party** (`betsWon`): every one of them is the
 *   perfect party;
 * - **the longest run of won bets** (`betStreak`): counted from one party into
 *   the next, in the order they were played — a run doesn't stop because the
 *   evening did.
 *
 * Both are read off the manches' points alone: a won bet is the only thing that
 * pays (see `bet.ts`).
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { GameId, GameStatsRecord, PlayerId } from "@/lib/domain";

import { betWon } from "./bet";
import type { ExtraMark } from "./ladder-records";

/** A mark, and the party it was posted in. */
export type PartyMark = ExtraMark & { gameId: GameId };

/** Each player's manches in one party, in the order they were played. */
function betsOf(
  party: Readonly<Pick<GameStatsRecord, "players" | "stageScores">>,
): Array<{ playerId: PlayerId; points: number[] }> {
  const scores = [...(party.stageScores ?? [])].sort(
    (a, b) => a.stage - b.stage,
  );

  return party.players.flatMap(seat => {
    const points = scores
      .filter(s => s.playerId === seat.playerId)
      .map(s => s.points);

    // A party keyed in as a bare total says nothing about its bets.
    return points.length === 0 ? [] : [{ playerId: seat.playerId, points }];
  });
}

/** How many bets each player won in one party. */
export function betsWonMarks(
  party: Readonly<Pick<GameStatsRecord, "players" | "stageScores">>,
): ExtraMark[] {
  return betsOf(party).map(({ playerId, points }) => ({
    playerId,
    value: points.filter(betWon).length,
    stage: null,
  }));
}

/**
 * Each player's longest run of won bets reached in each party, the run carried
 * over from the parties played before it. A party with no detail neither
 * breaks a run nor feeds it: nothing says how its bets went.
 */
export function betStreakMarks(
  parties: readonly GameStatsRecord[],
): PartyMark[] {
  // The party being recorded has no end yet: it is the last one played.
  const played = [...parties].sort((a, b) =>
    (a.endedAt ?? "￿").localeCompare(b.endedAt ?? "￿"),
  );
  const runs = new Map<PlayerId, number>();

  return played.flatMap(party =>
    betsOf(party).map(({ playerId, points }) => {
      let run = runs.get(playerId) ?? 0;
      // A run the party doesn't extend was already counted where it ended.
      let best = 0;

      for (const won of points.map(betWon)) {
        run = won ? run + 1 : 0;
        best = Math.max(best, run);
      }

      runs.set(playerId, run);

      return { gameId: party.gameId, playerId, value: best, stage: null };
    }),
  );
}
