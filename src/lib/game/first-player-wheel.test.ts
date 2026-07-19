import { describe, expect, it } from "vitest";

import {
  randomFraction,
  randomStopRotation,
  rotateToFirst,
  winningIndexAt,
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

describe("winningIndexAt", () => {
  it("finds the segment under the top pointer for a rotation", () => {
    // 4 segments (90° each); the top point maps to local angle −rotation.
    expect(winningIndexAt(0, 4)).toBe(0);
    expect(winningIndexAt(-90, 4)).toBe(1);
    expect(winningIndexAt(-180, 4)).toBe(2);
    expect(winningIndexAt(-270, 4)).toBe(3);
  });

  it("normalises whole turns and large angles", () => {
    expect(winningIndexAt(720, 4)).toBe(0); // 2 full turns → same as 0
    expect(winningIndexAt(45, 4)).toBe(winningIndexAt(720 + 45, 4));
  });

  it("returns 0 for a non-positive count", () => {
    expect(winningIndexAt(123, 0)).toBe(0);
  });
});

describe("randomStopRotation", () => {
  it("stops a random angle past at least `turns` full turns", () => {
    expect(randomStopRotation(0, 5, () => 0)).toBe(5 * 360);
    expect(randomStopRotation(0, 5, () => 0.5)).toBe(5 * 360 + 180);
    // Always forward from the current angle.
    expect(randomStopRotation(1000, 2, () => 0)).toBe(1000 + 720);
  });

  it("defaults to the crypto RNG and five turns", () => {
    const r = randomStopRotation(0);

    expect(r).toBeGreaterThanOrEqual(5 * 360);
    expect(r).toBeLessThan(6 * 360);
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
