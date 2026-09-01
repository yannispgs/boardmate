import { describe, expect, it } from "vitest";

import { quarterOf, spread } from "./recap-spread";

describe("spread", () => {
  it("places every evening between the smallest and the largest", () => {
    const bar = spread([40, 60], 50);

    expect(bar).toEqual({
      min: 40,
      max: 60,
      marks: [0, 1],
      cursor: 0.5,
    });
  });

  it("puts tonight at an end when tonight is the end", () => {
    const low = spread([40, 60], 30);
    const high = spread([40, 60], 90);

    expect(low?.cursor).toBe(0);
    expect(low?.min).toBe(30);
    expect(high?.cursor).toBe(1);
    expect(high?.max).toBe(90);
  });

  it("has nothing to draw on a first evening", () => {
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

describe("quarterOf", () => {
  it("cuts four evenings into four quarters", () => {
    expect(quarterOf(1, 4)).toBe(1);
    expect(quarterOf(2, 4)).toBe(2);
    expect(quarterOf(3, 4)).toBe(3);
    expect(quarterOf(4, 4)).toBe(4);
  });

  it("puts two evenings on the same figure in the same quarter", () => {
    expect(quarterOf(1, 8)).toBe(1);
    expect(quarterOf(2, 8)).toBe(1);
    expect(quarterOf(7, 8)).toBe(4);
    expect(quarterOf(8, 8)).toBe(4);
  });

  it("calls the better of two evenings the best quarter", () => {
    // Taken at the top of its share instead of the middle, being first of two
    // would land in the second quarter — a reproach for a figure nothing beat.
    expect(quarterOf(1, 2)).toBe(1);
    expect(quarterOf(2, 2)).toBe(3);
  });

  it("never leaves the four quarters", () => {
    expect(quarterOf(1, 1)).toBe(2);
    expect(quarterOf(30, 30)).toBe(4);
    expect(quarterOf(1, 100)).toBe(1);
  });
});
