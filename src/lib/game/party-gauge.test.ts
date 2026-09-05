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

  // The marks are what including tonight in the scale is for. Set by the past
  // alone, it ran end to end over it, so the two parties that fixed it sat on
  // 0 and 1 — and on a history of two, that was both of them, every time,
  // whatever they measured. A bar's worth of marks then said nothing.
  it("pulls the past inside the bar when this party is the longest yet", () => {
    const bar = gauge([4, 3], 6);

    expect(bar?.fill).toBe(1);
    expect(bar?.marks).toEqual([1 / 3, 0]);
  });

  it("pulls it in the other way when this party is the shortest yet", () => {
    const bar = gauge([6, 4], 3);

    expect(bar?.fill).toBe(0);
    expect(bar?.marks).toEqual([1, 1 / 3]);
  });

  // Two records used to read alike — both simply full. What tells them apart is
  // the gap the fill leaves between itself and the crowd behind it.
  it("shows how far ahead a record is, not only that it is one", () => {
    const byAHair = gauge([21, 22], 23);
    const byAMile = gauge([21, 22], 33);

    expect(byAHair?.fill).toBe(1);
    expect(byAMile?.fill).toBe(1);

    expect(Math.max(...(byAHair?.marks ?? []))).toBeCloseTo(0.5);
    expect(Math.max(...(byAMile?.marks ?? []))).toBeCloseTo(0.083);
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

  // A history with no width of its own still answers the question a second
  // party asks — longer, shorter, or the same — so the reference is drawn as
  // one mark in the middle and the bar is read against it.
  it("reads a party against a history that has no width", () => {
    expect(gauge([30, 30, 30], 12)).toEqual({ fill: 0, marks: [0.5] });
    expect(gauge([30, 30, 30], 44)).toEqual({ fill: 1, marks: [0.5] });
    expect(gauge([30, 30, 30], 30)).toEqual({ fill: 0.5, marks: [0.5] });
  });

  // The commonest case of all: a game played twice.
  it("reads a party against the only one before it", () => {
    expect(gauge([30], 44)).toEqual({ fill: 1, marks: [0.5] });
  });
});
