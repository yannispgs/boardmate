import { describe, expect, it } from "vitest";

import { canStep, clockReading, elapsedForReading } from "./turn-clock";

describe("clockReading", () => {
  it("reads a countdown as what is left of the turn", () => {
    expect(clockReading(180, 40)).toBe(140);
    expect(clockReading(180, 220)).toBe(-40);
  });

  it("reads a stopwatch as the time played itself", () => {
    expect(clockReading(null, 40)).toBe(40);
    expect(clockReading(null, 0)).toBe(0);
  });
});

describe("elapsedForReading", () => {
  it("gives the time played that leaves that much on the clock", () => {
    expect(elapsedForReading(180, 140)).toBe(40);
    expect(elapsedForReading(180, 0)).toBe(180);
  });

  it("counts an overtime as time played past the turn", () => {
    expect(elapsedForReading(180, -40)).toBe(220);
  });

  it("floors at zero when asked for more time than the turn is long", () => {
    expect(elapsedForReading(180, 300)).toBe(0);
  });

  it("credits a stopwatch with the time it is wound to", () => {
    expect(elapsedForReading(null, 140)).toBe(140);
    expect(elapsedForReading(null, 19.6)).toBe(20);
  });

  it("floors a stopwatch wound below zero", () => {
    expect(elapsedForReading(null, -20)).toBe(0);
  });
});

describe("canStep", () => {
  it("takes time off a countdown, into overtime if need be", () => {
    expect(canStep(90, 25, -10)).toBe(true);
    expect(canStep(90, 25, -25)).toBe(true);
    expect(canStep(90, 25, -30)).toBe(true);
  });

  it("gives a countdown time back up to the turn's length", () => {
    expect(canStep(90, 70, 10)).toBe(true);
    expect(canStep(90, 70, 20)).toBe(true);
    expect(canStep(90, 70, 30)).toBe(false);
  });

  it("gives an overtime its time back, and deepens it too", () => {
    expect(canStep(90, -20, 10)).toBe(true);
    expect(canStep(90, -20, 60)).toBe(true);
    expect(canStep(90, -20, -10)).toBe(true);
    expect(canStep(90, -20, -60)).toBe(true);
  });

  it("winds a stopwatch on without limit, and back to nought at most", () => {
    expect(canStep(null, 3600, 60)).toBe(true);
    expect(canStep(null, 40, -30)).toBe(true);
    expect(canStep(null, 40, -60)).toBe(false);
  });
});
