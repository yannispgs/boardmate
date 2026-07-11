import { describe, expect, it } from "vitest";

import {
  nextRotation,
  pickWinnerIndex,
  randomFraction,
  rotateToFirst,
} from "./first-player-wheel";

describe("randomFraction", () => {
  it("stays in [0, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const x = randomFraction();

      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("pickWinnerIndex", () => {
  it("maps the fraction to a uniform index in [0, count)", () => {
    expect(pickWinnerIndex(4, () => 0)).toBe(0);
    expect(pickWinnerIndex(4, () => 0.49)).toBe(1);
    expect(pickWinnerIndex(4, () => 0.5)).toBe(2);
    expect(pickWinnerIndex(4, () => 0.99)).toBe(3);
  });

  it("clamps a 1.0 fraction to the last index", () => {
    expect(pickWinnerIndex(3, () => 1)).toBe(2);
  });

  it("returns 0 for a non-positive count", () => {
    expect(pickWinnerIndex(0)).toBe(0);
  });

  it("defaults to the crypto RNG when no rand is given", () => {
    const i = pickWinnerIndex(5);

    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(5);
  });
});

describe("rotateToFirst", () => {
  it("moves the winner to the front, keeping the others in order", () => {
    expect(rotateToFirst(["a", "b", "c", "d"], 2)).toEqual([
      "c",
      "d",
      "a",
      "b",
    ]);
  });

  it("returns an unchanged copy for index 0 or negative", () => {
    const items = ["a", "b"];

    expect(rotateToFirst(items, 0)).toEqual(["a", "b"]);
    expect(rotateToFirst(items, -1)).toEqual(["a", "b"]);
    expect(rotateToFirst(items, 0)).not.toBe(items);
  });
});

describe("nextRotation", () => {
  it("lands the winning segment's centre under the top pointer", () => {
    // 4 segments (90° each). Segment 0 centre = 45° → rotate 315° to the top.
    expect(nextRotation(0, 4, 0, 0)).toBeCloseTo(315);
    // Segment 1 centre = 135° → 225°.
    expect(nextRotation(0, 4, 1, 0)).toBeCloseTo(225);
  });

  it("always spins forward past the current angle by whole turns", () => {
    const r = nextRotation(1000, 4, 0, 5);

    expect(r).toBeGreaterThan(1000);
    // Congruent to the zero-turn target (315°) modulo 360.
    expect(((r % 360) + 360) % 360).toBeCloseTo(315);
  });

  it("adds exactly the requested number of full turns", () => {
    // From 0, segment 0, 5 turns → 5·360 + 315.
    expect(nextRotation(0, 4, 0, 5)).toBeCloseTo(5 * 360 + 315);
  });
});
