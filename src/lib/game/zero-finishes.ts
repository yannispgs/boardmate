/**
 * Who walks away from a party without a single point, and how often.
 *
 * In a game whose points are penalties shared out between the players
 * (Papayoo), finishing at zero means every card that could have cost you
 * something went somewhere else — for a whole party, not a lucky trick. It is
 * the only figure in such a game that reads as an achievement rather than as
 * damage taken, which is why it gets a ranking of its own next to the worst
 * totals.
 *
 * Counted on the **final scores**, so it needs nothing from the way the party
 * was played: a party is one line per player, and a zero is a zero.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { GameStatsRecord, PlayerId } from "@/lib/domain";

/** One player's record at finishing a party at nothing. */
export interface ZeroFinishStat {
  playerId: PlayerId;
  name: string;
  /** Parties they played with a score recorded. */
  games: number;
  /** Of those, the ones they finished at 0. */
  zeroes: number;
  /** Share of parties they finished at 0 (0–1). */
  rate: number;
}

interface ZeroAccumulator {
  name: string;
  games: number;
  zeroes: number;
}

/**
 * How often each player finished a party at nothing, across the given parties.
 * Sorted by rate, best first. Players whose score was never recorded don't
 * appear: a missing score is not a zero, and counting it as one would hand the
 * ranking to whoever the app has the least data on.
 */
export function computeZeroFinishes(
  records: readonly GameStatsRecord[],
): ZeroFinishStat[] {
  const acc = new Map<PlayerId, ZeroAccumulator>();

  for (const record of records) {
    for (const player of record.players) {
      if (player.score === null) {
        continue;
      }

      const line = acc.get(player.playerId) ?? {
        name: player.name,
        games: 0,
        zeroes: 0,
      };

      line.games += 1;

      if (player.score === 0) {
        line.zeroes += 1;
      }

      acc.set(player.playerId, line);
    }
  }

  return [...acc.entries()]
    .map(([playerId, line]) => ({
      playerId,
      name: line.name,
      games: line.games,
      zeroes: line.zeroes,
      rate: line.zeroes / line.games,
    }))
    .sort((a, b) => b.rate - a.rate);
}
