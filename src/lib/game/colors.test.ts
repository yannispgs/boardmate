import { describe, expect, it } from "vitest";

import {
  countdownColor,
  timeIndexRedness,
  timeShareColor,
  timeShareRedness,
} from "./colors";

describe("countdownColor", () => {
  it("is green in the first half, then steps through the warning colours", () => {
    expect(countdownColor(60, 60)).toBe("#128700"); // full
    expect(countdownColor(31, 60)).toBe("#128700"); // > half
    expect(countdownColor(20, 60)).toBe("#C6C000"); // quarter..half
    expect(countdownColor(10, 60)).toBe("#cf6800"); // < quarter
  });

  it("is red once the time is up or the duration is invalid", () => {
    expect(countdownColor(0, 60)).toBe("#A30000");
    expect(countdownColor(-5, 60)).toBe("#A30000"); // overtime
    expect(countdownColor(10, 0)).toBe("#A30000");
  });
});

describe("timeIndexRedness", () => {
  it("is 0 at the fair share and 1 from the monopoly line on", () => {
    expect(timeIndexRedness(100)).toBe(0);
    expect(timeIndexRedness(80)).toBe(0); // under his due → clamped
    expect(timeIndexRedness(160)).toBe(1);
    expect(timeIndexRedness(400)).toBe(1); // twice as greedy is still greedy

    expect(timeIndexRedness(130)).toBeCloseTo(0.5);
  });
});

describe("timeShareRedness", () => {
  // The same ramp read off a raw percentage: `pct × n` is the index, so a
  // three-handed table's fair 33.3 % and its 53.3 % threshold are 100 and 160.
  it("is 0 at or below the fair share and 1 at the monopoly threshold", () => {
    // 3 players → fair 33.3%, threshold 53.3%.
    expect(timeShareRedness(33.33, 3)).toBeCloseTo(0);
    expect(timeShareRedness(20, 3)).toBe(0); // below fair → clamped
    expect(timeShareRedness(53.33, 3)).toBeCloseTo(1);
    expect(timeShareRedness(70, 3)).toBe(1); // over threshold → clamped
    // Halfway between fair and threshold.
    expect(timeShareRedness(43.33, 3)).toBeCloseTo(0.5, 1);
  });

  it("guards a non-positive player count", () => {
    expect(timeShareRedness(50, 0)).toBe(0);
  });
});

describe("timeShareColor", () => {
  it("stays on the base colour until the fair share, then blends to red", () => {
    // Not a winner, at/under fair share → indigo-500.
    expect(timeShareColor(20, 3, false)).toBe("rgb(99, 102, 241)");
    // At the monopoly threshold → full red.
    expect(timeShareColor(53.33, 3, false)).toBe("rgb(239, 68, 68)");
    // Winner under fair share keeps amber-400.
    expect(timeShareColor(20, 3, true)).toBe("rgb(251, 191, 36)");
    // A monopolising winner still goes red.
    expect(timeShareColor(70, 3, true)).toBe("rgb(239, 68, 68)");
  });
});
