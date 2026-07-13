import { describe, expect, it } from "vitest";

import { scoreHistogram } from "./score-distribution";

/** Sum of the bin counts must always equal the number of scores. */
function totalCount(scores: number[], maxBins?: number) {
  const h = scoreHistogram(scores, maxBins);

  return h === null ? 0 : h.bins.reduce((s, b) => s + b.count, 0);
}

describe("scoreHistogram", () => {
  it("returns null when there are no scores", () => {
    expect(scoreHistogram([])).toBeNull();
  });

  it("puts a single repeated value in one width-1 bin", () => {
    const h = scoreHistogram([7, 7, 7]);

    expect(h).not.toBeNull();
    expect(h?.step).toBe(1);
    expect(h?.min).toBe(7);
    expect(h?.max).toBe(7);
    expect(h?.mean).toBe(7);
    expect(h?.bins).toEqual([{ start: 7, end: 8, count: 3 }]);
  });

  it("buckets a mid-range spread into width-2 bins", () => {
    // range 18 over 10 bins → rough 1.8 → nice step 2.
    const h = scoreHistogram([0, 5, 5, 8, 15, 18]);

    expect(h?.step).toBe(2);
    expect(h?.bins[0]).toEqual({ start: 0, end: 2, count: 1 });
    // Every score is placed exactly once.
    expect(h?.bins.reduce((s, b) => s + b.count, 0)).toBe(6);
    // The top score lands in the last bin.
    expect(h?.bins.at(-1)).toEqual({ start: 18, end: 20, count: 1 });
  });

  it("chooses a nice step for each 1/2/5/10 band", () => {
    // rough 1 → step 1
    expect(scoreHistogram([0, 10])?.step).toBe(1);
    // rough 3 → step 5
    expect(scoreHistogram([0, 30])?.step).toBe(5);
    // rough 7 → step 10
    expect(scoreHistogram([0, 70])?.step).toBe(10);
  });

  it("keeps the width at least 1 for a tight integer range", () => {
    // range 2 over 10 bins → rough 0.2 → would be < 1, clamped to 1.
    const h = scoreHistogram([0, 1, 2]);

    expect(h?.step).toBe(1);
    expect(h?.bins).toHaveLength(3);
  });

  it("handles negative scores and unsorted input", () => {
    const scores = [5, -5, 9, 3, -2];
    const h = scoreHistogram(scores);

    expect(h?.min).toBe(-5);
    expect(h?.max).toBe(9);
    expect(h?.bins[0].start).toBeLessThanOrEqual(-5);
    expect(totalCount(scores)).toBe(scores.length);
  });

  it("respects a custom bin budget", () => {
    // range 100 over 4 bins → rough 25 → step 50.
    const h = scoreHistogram([0, 20, 60, 100], 4);

    expect(h?.step).toBe(50);
    expect(totalCount([0, 20, 60, 100], 4)).toBe(4);
  });
});
