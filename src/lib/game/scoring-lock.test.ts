import { describe, expect, it } from "vitest";
import { SCORING_TAKE_OVER_MINUTES, scoringTakeOverAt } from "./scoring-lock";

describe("scoringTakeOverAt", () => {
  it("offers the take-over ten minutes after the form was taken", () => {
    const lockedAt = new Date("2026-11-15T20:00:00.000Z");

    expect(SCORING_TAKE_OVER_MINUTES).toBe(10);
    expect(scoringTakeOverAt(lockedAt).toISOString()).toBe(
      "2026-11-15T20:10:00.000Z",
    );
  });
});
