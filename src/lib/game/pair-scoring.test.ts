import { describe, expect, it } from "vitest";

import type { PlayerId } from "@/lib/domain";
import {
  pairBreakdown,
  pileKey,
  pilesFor,
  pilesOfSeat,
  pilesRemaining,
  readPairBreakdown,
  scorePiles,
} from "./pair-scoring";

const seat = (n: number) => `p${n}` as PlayerId;

const THREE = [seat(1), seat(2), seat(3)];

describe("pilesFor", () => {
  it("puts one pile between each pair of neighbours, closing the circle", () => {
    expect(pilesFor(THREE)).toEqual([
      { key: "pile0", between: [seat(1), seat(2)] },
      { key: "pile1", between: [seat(2), seat(3)] },
      { key: "pile2", between: [seat(3), seat(1)] },
    ]);
  });

  it("gives a lone player no pile, having nobody to share one with", () => {
    expect(pilesFor([seat(1)])).toEqual([]);
    expect(pilesFor([])).toEqual([]);
  });
});

describe("pilesOfSeat", () => {
  it("flanks a seat with the pile before it and the pile after it", () => {
    expect(pilesOfSeat(THREE, seat(2))).toEqual({
      left: "pile0",
      right: "pile1",
    });
  });

  it("wraps the first seat's left pile round to the last one", () => {
    expect(pilesOfSeat(THREE, seat(1))).toEqual({
      left: "pile2",
      right: "pile0",
    });
  });

  it("has nothing to flank for a player who isn't seated here", () => {
    expect(pilesOfSeat(THREE, seat(9))).toBeNull();
    expect(pilesOfSeat([seat(1)], seat(1))).toBeNull();
  });
});

describe("scorePiles", () => {
  it("multiplies each player's two piles, sharing every pile with a neighbour", () => {
    const scores = scorePiles(THREE, { pile0: 12, pile1: 7, pile2: 5 });

    expect(scores[seat(1)]).toEqual({ left: 5, right: 12, total: 60 });
    expect(scores[seat(2)]).toEqual({ left: 12, right: 7, total: 84 });
    expect(scores[seat(3)]).toEqual({ left: 7, right: 5, total: 35 });
  });

  it("zeroes both owners of an empty pile, as the game's rule demands", () => {
    const scores = scorePiles(THREE, { pile0: 0, pile1: 7, pile2: 5 });

    expect(scores[seat(1)].total).toBe(0);
    expect(scores[seat(2)].total).toBe(0);
    expect(scores[seat(3)].total).toBe(35);
  });

  it("counts a pile nobody entered as nothing", () => {
    const scores = scorePiles(THREE, { pile0: 12 });

    expect(scores[seat(2)]).toEqual({ left: 12, right: 0, total: 0 });
  });

  it("leaves a lone player at zero, having no pile to multiply", () => {
    expect(scorePiles([seat(1)], {})[seat(1)]).toEqual({
      left: 0,
      right: 0,
      total: 0,
    });
  });
});

describe("pilesRemaining", () => {
  it("counts the piles still to be entered", () => {
    expect(pilesRemaining(THREE, {})).toBe(3);
    expect(pilesRemaining(THREE, { pile0: 0, pile2: 4 })).toBe(1);
    expect(pilesRemaining(THREE, { pile0: 0, pile1: 4, pile2: 4 })).toBe(0);
  });
});

describe("pairBreakdown", () => {
  it("stores the two piles behind the product", () => {
    expect(pairBreakdown({ left: 12, right: 7, total: 84 })).toEqual({
      left: 12,
      right: 7,
    });
  });

  it("reads them back for the recap", () => {
    expect(readPairBreakdown({ left: 12, right: 7 })).toEqual({
      left: 12,
      right: 7,
    });
  });

  it("has nothing to read from a game scored some other way", () => {
    expect(readPairBreakdown(null)).toBeNull();
    expect(readPairBreakdown({ ours: 12 })).toBeNull();
    expect(readPairBreakdown({ left: 12 })).toBeNull();
  });
});

describe("pileKey", () => {
  it("names a pile after the seat it opens from", () => {
    expect(pileKey(0)).toBe("pile0");
    expect(pileKey(7)).toBe("pile7");
  });
});
