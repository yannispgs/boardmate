import { describe, expect, it } from "vitest";

import { gauge } from "./party-gauge";

describe("gauge", () => {
  it("fills the bar to where this party falls between the past ends", () => {
    const bar = gauge([10, 20], 15);

    expect(bar).toEqual({ fill: 0.5, marks: [0, 1] });
  });

  // The two ends are the whole point of measuring against the past alone: they
  // are the only readings a scale doesn't hand out to every party.
  it("empties the bar for a party below everything that came before", () => {
    const bar = gauge([10, 20], 4);

    expect(bar?.fill).toBe(0);
  });

  it("fills it completely for a party above everything that came before", () => {
    const bar = gauge([10, 20], 90);

    expect(bar?.fill).toBe(1);
  });

  it("empties it for a party level with the lowest of the past", () => {
    const bar = gauge([10, 20], 10);

    expect(bar?.fill).toBe(0);
  });

  // What the marks exist for: the fill alone would read as a fine evening.
  it("marks the crowd the past parties make, wherever the fill lands", () => {
    const bar = gauge([10, 95, 96, 97, 100], 90);

    expect(bar?.fill).toBeCloseTo(0.889);
    expect(bar?.marks[0]).toBe(0);
    expect(bar?.marks[1]).toBeCloseTo(0.944);
    expect(bar?.marks[4]).toBe(1);
  });

  it("draws no bar on a first party, which has nothing behind it", () => {
    expect(gauge([], 40)).toBeNull();
  });

  // An empty bar would claim « the lowest ever » against parties that were all
  // the same figure — a record read off a history with no width.
  it("draws no bar when every past party landed on the same figure", () => {
    expect(gauge([30, 30, 30], 12)).toBeNull();
  });
});
