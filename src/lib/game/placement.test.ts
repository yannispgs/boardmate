import { describe, expect, it } from "vitest";

import type { PlayerId } from "@/lib/domain";
import { placements, relativePosition } from "./placement";

const ann = "ann" as PlayerId;
const bob = "bob" as PlayerId;
const cat = "cat" as PlayerId;

/** A table, written the short way the expectations read best in. */
function table(...scores: Array<[PlayerId, number | null]>) {
  return scores.map(([playerId, score]) => ({ playerId, score }));
}

describe("placements", () => {
  it("ranks the biggest total first where the biggest wins", () => {
    const ranks = placements(table([ann, 8], [bob, 12], [cat, 10]), "highest");

    expect(ranks?.get(bob)).toBe(1);
    expect(ranks?.get(cat)).toBe(2);
    expect(ranks?.get(ann)).toBe(3);
  });

  it("turns the scale over on a game the smallest total wins", () => {
    const ranks = placements(table([ann, 8], [bob, 12], [cat, 10]), "lowest");

    expect(ranks?.get(ann)).toBe(1);
    expect(ranks?.get(cat)).toBe(2);
    expect(ranks?.get(bob)).toBe(3);
  });

  // Two level for the lead are both first, and the next one is third — the
  // rank a podium would give them, not the row they happen to be sorted into.
  it("hands a tie the same rank and skips the one it swallowed", () => {
    const ranks = placements(table([ann, 10], [bob, 10], [cat, 4]), "highest");

    expect(ranks?.get(ann)).toBe(1);
    expect(ranks?.get(bob)).toBe(1);
    expect(ranks?.get(cat)).toBe(3);
  });

  // Read as a zero, a missing score would take the lead outright on a game the
  // smallest total wins — so no rank is drawn from a half-filled sheet at all.
  it("refuses to rank a party somebody was never scored in", () => {
    expect(placements(table([ann, 10], [bob, null]), "highest")).toBeNull();
  });

  it("ranks an empty table without complaining", () => {
    expect(placements([], "highest")?.size).toBe(0);
  });
});

describe("relativePosition", () => {
  it("runs from 0 for the winner to 1 for the last", () => {
    expect(relativePosition(1, 4)).toBe(0);
    expect(relativePosition(4, 4)).toBe(1);
  });

  it("puts the same finish at the same figure whatever the table size", () => {
    // Halfway down a 3-player table and halfway down a 5-player one.
    expect(relativePosition(2, 3)).toBe(0.5);
    expect(relativePosition(3, 5)).toBe(0.5);
  });

  it("calls a lone player a winner rather than dividing by nothing", () => {
    expect(relativePosition(1, 1)).toBe(0);
  });
});
