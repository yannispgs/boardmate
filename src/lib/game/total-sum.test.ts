import { describe, expect, it } from "vitest";

import type { ScoringSpec } from "@/lib/domain";

import { completingScore, totalSumError } from "./total-sum";

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

/** A shared pile a player can end up owing points out of. */
const OWED: ScoringSpec = { ...PAPAYOO, allowNegative: true };

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

  it("reports an overshoot before the sheet is even finished", () => {
    // The last box fills itself, so a table that never types it would face a
    // refused sheet with nothing on it to read.
    expect(totalSumError(entries(200, null, 100), PAPAYOO)).toBe(
      "Le total dépasse déjà 250 points (actuellement 300).",
    );
  });

  it("waits for the whole sheet where a later score can still be negative", () => {
    expect(totalSumError(entries(200, null, 100), OWED)).toBeNull();
  });
});

describe("completingScore", () => {
  it("gives the last box the points nobody else took", () => {
    expect(completingScore(entries(100, null, 60), PAPAYOO)).toBe(90);
  });

  it("gives zero when the others already shared out everything", () => {
    expect(completingScore(entries(150, 100, null), PAPAYOO)).toBe(0);
  });

  it("says nothing while two boxes are empty", () => {
    // Two unknowns have no single answer, and guessing one would be a lie the
    // table has no reason to spot.
    expect(completingScore(entries(100, null, null), PAPAYOO)).toBeNull();
  });

  it("says nothing once every box is filled in", () => {
    expect(completingScore(entries(100, 90, 60), PAPAYOO)).toBeNull();
  });

  it("says nothing on a value the game's scores could never hold", () => {
    // 250 already handed out and more besides: that's a miscount higher up the
    // sheet, which `totalSumError` is the one to report.
    expect(completingScore(entries(200, null, 100), PAPAYOO)).toBeNull();
  });

  it("completes into the negative where a game allows it", () => {
    expect(completingScore(entries(200, null, 100), OWED)).toBe(-50);
  });

  it("says nothing about a game whose totals answer to nothing", () => {
    expect(completingScore(entries(12, null), FREE)).toBeNull();
  });

  it("says nothing when the game is unscored", () => {
    expect(completingScore(entries(12, null), null)).toBeNull();
  });
});
