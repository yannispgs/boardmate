import { describe, expect, it } from "vitest";

import { countdownColor } from "./colors";

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
