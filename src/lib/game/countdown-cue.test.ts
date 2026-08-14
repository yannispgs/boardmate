import { describe, expect, it } from "vitest";

import { countdownCue } from "./countdown-cue";

describe("countdownCue", () => {
  it("says nothing at the first reading of a turn", () => {
    expect(countdownCue(null, 60)).toBeNull();
    expect(countdownCue(null, 3)).toBeNull();
  });

  it("says nothing while the turn still has time to spare", () => {
    expect(countdownCue(60, 59)).toBeNull();
    expect(countdownCue(12, 11)).toBeNull();
  });

  it("beeps on each of the last ten seconds", () => {
    expect(countdownCue(11, 10)).toBe("beep");
    expect(countdownCue(2, 1)).toBe("beep");
  });

  it("rings when the turn runs out", () => {
    expect(countdownCue(1, 0)).toBe("ring");
  });

  it("beeps once for a jump that lands inside the last ten seconds", () => {
    // The screen was locked: the clock froze at 40 and caught up at 3.
    expect(countdownCue(40, 3)).toBe("beep");
  });

  it("rings for a jump that steps straight over zero", () => {
    // Same stall, but the turn ended while the phone was asleep — the ring is
    // still the thing to say, even though the exact zero was never read.
    expect(countdownCue(40, -12)).toBe("ring");
  });

  it("rings only the once, then leaves the overtime alone", () => {
    expect(countdownCue(-1, -2)).toBeNull();
    expect(countdownCue(0, -1)).toBeNull();
  });

  it("says nothing when the clock stands still or goes back up", () => {
    // Pausing and resuming re-reads the same instant, and raising the turn's
    // duration hands time back — neither is a second going by.
    expect(countdownCue(5, 5)).toBeNull();
    expect(countdownCue(5, 65)).toBeNull();
  });
});
