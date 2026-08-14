import { describe, expect, it } from "vitest";

import type { ScoringSpec } from "@/lib/domain";
import { roundPlayedOut, stopsAtRoundEnd, stopTurn } from "./stop-condition";

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

describe("stopTurn", () => {
  it("ends the lap the target was first reached in", () => {
    // 3 seats: lap 2 runs on turns 4–6, so the game dies on turn 6.
    const events = [
      { score: 12, round: 2 },
      { score: 15, round: 2 },
    ];

    expect(stopTurn(events, [15, 9, 4], 15, 3)).toBe(6);
  });

  it("keeps the first lap that reached it, not the latest", () => {
    const events = [
      { score: 15, round: 2 },
      { score: 17, round: 4 },
    ];

    expect(stopTurn(events, [17, 3], 15, 2)).toBe(4);
  });

  it("aims at nothing while the target is out of reach", () => {
    expect(stopTurn([{ score: 12, round: 3 }], [12, 8], 15, 3)).toBeNull();
  });

  it("aims at nothing when the game has no target at all", () => {
    expect(stopTurn([{ score: 40, round: 3 }], [40], null, 3)).toBeNull();
  });

  it("lets a correction call the ending off", () => {
    // Typed 15 by mistake in lap 2, put back to 11: the event stays on the
    // record for good, the standing is what says the game goes on.
    const events = [{ score: 15, round: 2 }];

    expect(stopTurn(events, [11, 9], 15, 2)).toBeNull();
  });

  it("waits for the record when the standing is ahead of it", () => {
    // The score has just been typed and the screen already shows it, but the
    // event it is being saved as hasn't come back yet: nothing says which lap
    // to end, so the game keeps running until it does.
    expect(stopTurn([], [15, 9], 15, 2)).toBeNull();
  });

  it("ends the shared turn itself in a simultaneous game", () => {
    expect(stopTurn([{ score: 15, round: 4 }], [15], 15, 1)).toBe(4);
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
