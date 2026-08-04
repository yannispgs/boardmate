import { describe, expect, it } from "vitest";

import type { PlayerId } from "@/lib/domain";
import { revealGroups } from "./reveal";
import type { Ranked } from "./scoring";

/** A ranked line, as `rankByTotal` would produce it. */
function ranked(playerId: string, total: number, rank: number): Ranked {
  return { playerId: playerId as PlayerId, total, rank };
}

describe("revealGroups", () => {
  it("has no group for an empty ranking", () => {
    expect(revealGroups([])).toEqual([]);
  });

  it("returns one group per player, worst place first", () => {
    const groups = revealGroups([
      ranked("a", 30, 1),
      ranked("b", 20, 2),
      ranked("c", 10, 3),
    ]);

    expect(groups.map(g => g.rank)).toEqual([3, 2, 1]);
    expect(groups.map(g => g.players.map(p => p.playerId))).toEqual([
      ["c"],
      ["b"],
      ["a"],
    ]);
  });

  it("groups the players sharing a place", () => {
    // 1, 2, 2, 4 — the two seconds come out together.
    const groups = revealGroups([
      ranked("a", 30, 1),
      ranked("b", 20, 2),
      ranked("c", 20, 2),
      ranked("d", 10, 4),
    ]);

    expect(groups.map(g => g.rank)).toEqual([4, 2, 1]);
    expect(groups[1].players.map(p => p.playerId)).toEqual(["b", "c"]);
  });

  it("keeps tied leaders in a single last group", () => {
    const groups = revealGroups([
      ranked("a", 30, 1),
      ranked("b", 30, 1),
      ranked("c", 10, 3),
    ]);

    expect(groups).toHaveLength(2);

    const top = groups.at(-1);

    expect(top?.rank).toBe(1);
    expect(top?.players.map(p => p.playerId)).toEqual(["a", "b"]);
  });

  it("makes one group of a table level throughout", () => {
    const groups = revealGroups([
      ranked("a", 10, 1),
      ranked("b", 10, 1),
      ranked("c", 10, 1),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].players).toHaveLength(3);
  });

  it("leaves the ranking it was given untouched", () => {
    const ranking = [ranked("a", 30, 1), ranked("b", 10, 2)];

    revealGroups(ranking);

    expect(ranking.map(r => r.playerId)).toEqual(["a", "b"]);
  });
});
