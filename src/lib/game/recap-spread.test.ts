import { describe, expect, it } from "vitest";

import { spread, topPercent } from "./recap-spread";

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
