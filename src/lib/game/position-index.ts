/**
 * Where each player tends to finish on a game, and the two orders the players
 * of a game can be listed in.
 *
 * The win rate only knows first and not-first: a player who is always second
 * and one who is always last read the same 0 %. The position index tells them
 * apart, on the 0–100 scale the seat and neighbour statistics already speak.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { GameStatsRecord, PlayerId } from "@/lib/domain";
import { finishPlaces, relativePosition } from "./placement";
import type { ScoreDirection } from "./scoring";

/**
 * Each player's mean placement over the parties, 0 = always first, 100 =
 * always last — the scale runs **down**, like every placement in the app.
 *
 * Read on {@link finishPlaces}, so a tie-break counts: the player the table
 * crowned is first, not merely level. Every party weighs the same, whatever
 * its size, since the placement is already relative to the table.
 *
 * Two kinds of party are left out rather than counted: one whose sheet is
 * missing a score (it ranks nobody), and one that separates nobody — a
 * cooperative party, a lone player, a shared victory for the whole table —
 * which would otherwise hand everyone a free first place. A player with no
 * party left is simply absent from the map.
 */
export function positionIndexes(
  records: ReadonlyArray<GameStatsRecord>,
  direction: ScoreDirection,
): Map<PlayerId, number> {
  const totals = new Map<PlayerId, { sum: number; count: number }>();

  for (const record of records) {
    const ranks = finishPlaces(record.players, direction);

    if (ranks === null || [...ranks.values()].every(rank => rank === 1)) {
      continue;
    }

    for (const [playerId, rank] of ranks) {
      const total = totals.get(playerId) ?? { sum: 0, count: 0 };

      total.sum += relativePosition(rank, record.players.length) * 100;
      total.count += 1;
      totals.set(playerId, total);
    }
  }

  return new Map(
    [...totals].map(([playerId, { sum, count }]) => [playerId, sum / count]),
  );
}

/** What a game's player list can be ordered by. */
export type PlayerOrder = "winRate" | "position";

/** The least a player line must carry to be ordered here. */
interface Orderable {
  playerId: PlayerId;
  name: string;
  games: number;
  /** 0–100. */
  winRate: number;
}

/**
 * The players, best first, on the chosen figure.
 *
 * Ties fall to the other figures before the name, in the order a reader would
 * reach for them: on position, the win rate then the number of parties; on win
 * rate, the number of parties — two players at 100 % are not level when one of
 * them won a single party. A player with no position sits after every player
 * who has one, since « nothing measured » is not « always last ».
 */
export function orderPlayers<T extends Orderable>(
  players: ReadonlyArray<T>,
  order: PlayerOrder,
  indexes: ReadonlyMap<PlayerId, number>,
): T[] {
  return [...players].sort((a, b) => {
    if (order === "position") {
      const byPosition = comparePositions(
        indexes.get(a.playerId),
        indexes.get(b.playerId),
      );

      if (byPosition !== 0) {
        return byPosition;
      }
    }

    return (
      b.winRate - a.winRate || b.games - a.games || a.name.localeCompare(b.name)
    );
  });
}

/** Smallest first, a missing one after every present one. */
function comparePositions(a: number | undefined, b: number | undefined) {
  if (a === undefined || b === undefined) {
    return Number(a === undefined) - Number(b === undefined);
  }

  return a - b;
}
