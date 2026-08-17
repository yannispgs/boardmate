import { describe, expect, it } from "vitest";

import type { ScoringSpec } from "@/lib/domain";

import { totalSumError } from "./total-sum";

const PAPAYOO: ScoringSpec = {
  timing: "final",
  entry: "total",
  stopCondition: null,
  winCondition: { type: "lowest" },
  totalSum: 250,
};

const FREE: ScoringSpec = {
  timing: "final",
  entry: "total",
  stopCondition: null,
  winCondition: { type: "highest" },
};

/** The end-of-game form's boxes, one number (or one blank) per player. */
function entries(...scores: Array<number | null>) {
  return scores.map(score => ({ score }));
}

describe("totalSumError", () => {
  it("accepts a sheet whose scores share out the whole pile", () => {
    expect(totalSumError(entries(100, 90, 60), PAPAYOO)).toBeNull();
  });

  it("accepts a table where a single player took everything", () => {
    expect(totalSumError(entries(250, 0, 0), PAPAYOO)).toBeNull();
  });

  it("refuses a sheet that hands out too few points, and says how few", () => {
    expect(totalSumError(entries(100, 90, 50), PAPAYOO)).toBe(
      "Le total doit faire 250 points (actuellement 240).",
    );
  });

  it("refuses a sheet that hands out too many", () => {
    expect(totalSumError(entries(100, 90, 90), PAPAYOO)).toBe(
      "Le total doit faire 250 points (actuellement 280).",
    );
  });

  it("stays silent while a box is still empty", () => {
    // Half a sheet is unfinished, not miscounted: the button is disabled
    // anyway, so shouting at a table still typing helps nobody.
    expect(totalSumError(entries(100, null, 60), PAPAYOO)).toBeNull();
  });

  it("says nothing about a game whose totals answer to nothing", () => {
    expect(totalSumError(entries(12, 999), FREE)).toBeNull();
  });

  it("says nothing when the game is unscored", () => {
    expect(totalSumError(entries(12, 999), null)).toBeNull();
  });

  it("says nothing when there is no player to read", () => {
    expect(totalSumError([], PAPAYOO)).toBeNull();
  });
});
