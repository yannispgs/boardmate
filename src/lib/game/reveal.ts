import type { Ranked } from "./scoring";

/** The players sharing one place of the final standings. */
export interface RankGroup {
  /** The place they share (1 = the winner's). */
  rank: number;
  /** Everyone on that place, in the ranking's own order. */
  players: Ranked[];
}

/**
 * Cuts the standings into places, **worst place first** — the order the
 * end-of-game reveal uncovers them in. Players sharing a place come out
 * together, so an ex æquo is announced as one instead of leaking a place ahead
 * of time, and the winner's place is always the last group revealed.
 */
export function revealGroups(ranking: Ranked[]): RankGroup[] {
  const groups: RankGroup[] = [];

  for (const player of ranking) {
    const current = groups.at(-1);

    if (current?.rank === player.rank) {
      current.players.push(player);
    } else {
      groups.push({ rank: player.rank, players: [player] });
    }
  }

  return groups.reverse();
}
