import { describe, expect, it } from "vitest";

import { spread, standing, topPercent } from "./recap-spread";

describe("spread", () => {
  it("places every party between the smallest and the largest", () => {
    const bar = spread([40, 60], 50);

    expect(bar).toEqual({
      min: 40,
      max: 60,
      marks: [0, 1],
      cursor: 0.5,
    });
  });

  it("puts this party at an end when this party is the end", () => {
    const low = spread([40, 60], 30);
    const high = spread([40, 60], 90);

    expect(low?.cursor).toBe(0);
    expect(low?.min).toBe(30);
    expect(high?.cursor).toBe(1);
    expect(high?.max).toBe(90);
  });

  it("has nothing to draw on a first party", () => {
    expect(spread([], 50)).toBeNull();
  });

  it("stacks a run of identical figures in the middle", () => {
    // Nothing ever moved, so there is no width to divide by — and the picture
    // of one mark under the cursor is the truthful one.
    const bar = spread([50, 50], 50);

    expect(bar).toEqual({
      min: 50,
      max: 50,
      marks: [0.5, 0.5],
      cursor: 0.5,
    });
  });
});

describe("topPercent", () => {
  it("reads a rank out of four as a quarter of the way down", () => {
    expect(topPercent(1, 4)).toBe(25);
    expect(topPercent(2, 4)).toBe(50);
    expect(topPercent(3, 4)).toBe(75);
    expect(topPercent(4, 4)).toBe(100);
  });

  it("rounds to the nearest whole percent", () => {
    // Three parties fall on thirds, which no percentage says exactly.
    expect(topPercent(1, 3)).toBe(33);
    expect(topPercent(2, 3)).toBe(67);
    expect(topPercent(3, 3)).toBe(100);
  });

  it("gets finer as the history gets longer", () => {
    expect(topPercent(1, 100)).toBe(1);
    expect(topPercent(7, 8)).toBe(88);
    expect(topPercent(8, 8)).toBe(100);
  });

  it("calls the better of two parties the top half", () => {
    expect(topPercent(1, 2)).toBe(50);
    expect(topPercent(2, 2)).toBe(100);
  });
});

describe("standing", () => {
  /** Eight other parties, all strictly between 20 and 90. */
  const middling = [30, 35, 40, 45, 50, 55, 60, 65];

  it("names the two ends of a player's own history", () => {
    expect(standing(1, 90, [40, 60], "highest")).toEqual({ kind: "best" });
    expect(standing(3, 20, [40, 60], "highest")).toEqual({ kind: "worst" });
  });

  it("reads the ends off the figures, so the low one wins when low is good", () => {
    expect(standing(1, 20, [40, 60], "lowest")).toEqual({ kind: "best" });
    expect(standing(3, 90, [40, 60], "lowest")).toEqual({ kind: "worst" });
  });

  it("counts a party tied for an end as being at that end", () => {
    // Two parties share the best figure, so this one carries rank 1 and the
    // other does too — « sa meilleure » is true of both.
    expect(standing(1, 60, [60, 40], "highest")).toEqual({ kind: "best" });

    // And at the other end the rank does not even reach the total: the two
    // parties tied for last share rank 2 out of 3, which is why the figures
    // rather than the rank decide.
    expect(standing(2, 40, [40, 60], "highest")).toEqual({ kind: "worst" });
  });

  it("calls a run of identical figures neither best nor worst", () => {
    expect(standing(1, 50, [50, 50], "highest")).toEqual({
      kind: "rank",
      rank: 1,
      total: 3,
    });
  });

  it("gives an exact rank up to ten parties", () => {
    expect(standing(4, 47, middling, "highest")).toEqual({
      kind: "rank",
      rank: 4,
      total: 9,
    });

    // Ten is still a rank; eleven is where « 7ᵉ sur 11 » stops being read.
    expect(standing(5, 47, [...middling, 70], "highest")).toEqual({
      kind: "rank",
      rank: 5,
      total: 10,
    });
  });

  it("switches to a percentage past ten parties", () => {
    expect(standing(6, 47, [...middling, 70, 75], "highest")).toEqual({
      kind: "percent",
      percent: 55,
    });
  });

  it("still names the ends however long the history is", () => {
    const long = [...middling, 70, 75, 80];

    expect(standing(1, 100, long, "highest")).toEqual({ kind: "best" });
    expect(standing(12, 10, long, "highest")).toEqual({ kind: "worst" });
  });
});
