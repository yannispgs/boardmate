import { describe, expect, it } from "vitest";

import type { ScoringSpec } from "@/lib/domain";
import {
  closingRound,
  lastRound,
  roundPlayedOut,
  stopsAtRoundEnd,
} from "./stop-condition";

const scoring = (timing?: "immediate" | "roundEnd"): ScoringSpec => ({
  timing: "live",
  entry: "total",
  stopCondition: { type: "scoreTarget", field: "pointsToWin", timing },
  winCondition: { type: "highest" },
});

describe("stopsAtRoundEnd", () => {
  it("is true only for a game that plays the lap out", () => {
    expect(stopsAtRoundEnd(scoring("roundEnd"))).toBe(true);
    expect(stopsAtRoundEnd(scoring("immediate"))).toBe(false);
    expect(stopsAtRoundEnd(scoring())).toBe(false);
  });

  it("is false for a game with no target and for an unscored one", () => {
    expect(
      stopsAtRoundEnd({
        timing: "final",
        entry: "total",
        winCondition: { type: "highest" },
      }),
    ).toBe(false);
    expect(stopsAtRoundEnd(null)).toBe(false);
  });
});

describe("closingRound", () => {
  it("closes the lap the target was first reached in", () => {
    const events = [
      { score: 12, round: 2 },
      { score: 15, round: 2 },
    ];

    expect(closingRound(events, [15, 9, 4], 15)).toBe(2);
  });

  it("keeps the first lap that reached it, not the latest", () => {
    const events = [
      { score: 15, round: 2 },
      { score: 17, round: 4 },
    ];

    expect(closingRound(events, [17, 3], 15)).toBe(2);
  });

  it("closes nothing while the target is out of reach", () => {
    expect(closingRound([{ score: 12, round: 3 }], [12, 8], 15)).toBeNull();
  });

  it("closes nothing when the game has no target at all", () => {
    expect(closingRound([{ score: 40, round: 3 }], [40], null)).toBeNull();
  });

  it("lets a correction call the ending off", () => {
    // Typed 15 by mistake in lap 2, put back to 11: the event stays on the
    // record for good, the standing is what says the game goes on.
    const events = [{ score: 15, round: 2 }];

    expect(closingRound(events, [11, 9], 15)).toBeNull();
  });

  it("waits for the record when the standing is ahead of it", () => {
    // The score has just been typed and the screen already shows it, but the
    // event it is being saved as hasn't come back yet: nothing says which lap
    // to end, so the game keeps running until it does.
    expect(closingRound([], [15, 9], 15)).toBeNull();
  });
});

describe("lastRound", () => {
  it("takes whichever ending comes first", () => {
    expect(lastRound(8, 5)).toBe(5);
    expect(lastRound(4, 6)).toBe(4);
  });

  it("falls back on the one ending the game has", () => {
    expect(lastRound(null, 5)).toBe(5);
    expect(lastRound(8, null)).toBe(8);
  });

  it("leaves an open-ended game with no end in sight", () => {
    expect(lastRound(null, null)).toBeNull();
  });
});

describe("roundPlayedOut", () => {
  it("waits for the turn to move past the closing lap", () => {
    expect(roundPlayedOut(6, 5)).toBe(false);
    expect(roundPlayedOut(6, 6)).toBe(false); // the last seat is still playing
    expect(roundPlayedOut(6, 7)).toBe(true);
  });

  it("is false while the game aims at nothing", () => {
    expect(roundPlayedOut(null, 99)).toBe(false);
  });
});
