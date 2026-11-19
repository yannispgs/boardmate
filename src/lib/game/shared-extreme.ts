/**
 * The most a single manche gave or cost anyone in a party — the biggest drop
 * on Luz, the heaviest manche on a shedding game — and **everyone** who took
 * it, not just the first one met.
 *
 * A mark most of the table shares singles nobody out: three players of four
 * at −5 is the party's floor, not a feat. So once more than half the table has
 * taken it, there is nothing to tell and the answer is null.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { PlayerId, StageScore } from "@/lib/domain";

/** One player who took the mark, and the manches they took it on. */
export interface ExtremeTaker {
  name: string;
  /** In play order. */
  stages: number[];
}

export interface SharedExtreme {
  points: number;
  /** In seat order. */
  who: ExtremeTaker[];
}

/**
 * The extreme of `scores` — whichever `beats` the rest, starting from a bar of
 * 0 — and who took it, or null when nothing beat the bar or most of `players`
 * took it.
 */
export function sharedExtreme(
  players: readonly { playerId: PlayerId; name: string }[],
  scores: readonly StageScore[],
  beats: (points: number, than: number) => boolean,
): SharedExtreme | null {
  const points = scores.reduce(
    (best, s) => (beats(s.points, best) ? s.points : best),
    0,
  );

  if (points === 0) {
    return null;
  }

  const stagesOf = new Map<PlayerId, number[]>();

  for (const s of scores.filter(s => s.points === points)) {
    stagesOf.set(s.playerId, [...(stagesOf.get(s.playerId) ?? []), s.stage]);
  }

  if (stagesOf.size > players.length / 2) {
    return null;
  }

  const seat = (id: PlayerId) => {
    const i = players.findIndex(p => p.playerId === id);

    return i === -1 ? players.length : i;
  };

  return {
    points,
    who: [...stagesOf]
      .sort(([a], [b]) => seat(a) - seat(b))
      .map(([id, stages]) => ({
        name: players.find(p => p.playerId === id)?.name ?? "?",
        stages: stages.toSorted((a, b) => a - b),
      })),
  };
}

/**
 * The one manche every taker took the mark on, or null when it was taken on
 * more than one — then each name carries its own.
 */
export function commonStage(who: readonly ExtremeTaker[]): number | null {
  const stages = new Set(who.flatMap(t => t.stages));

  return stages.size === 1 ? [...stages][0] : null;
}
