import { describe, expect, it } from "vitest";

import {
  elapsedForRemaining,
  formatClockInput,
  parseClock,
} from "./turn-clock";

describe("parseClock", () => {
  it("reads a bare seconds count", () => {
    expect(parseClock("90")).toBe(90);
    expect(parseClock("0")).toBe(0);
    expect(parseClock("  45  ")).toBe(45);
  });

  it("reads a m:ss clock", () => {
    expect(parseClock("1:30")).toBe(90);
    expect(parseClock("0:07")).toBe(7);
    expect(parseClock("10:00")).toBe(600);
  });

  it("keeps the sign, so an overtime can be typed back", () => {
    expect(parseClock("-0:40")).toBe(-40);
    expect(parseClock("-15")).toBe(-15);
    expect(parseClock("+30")).toBe(30);
  });

  it("rejects anything that is not a clock", () => {
    expect(parseClock("")).toBeNull();
    expect(parseClock("abc")).toBeNull();
    expect(parseClock("1:60")).toBeNull();
    expect(parseClock("1:5")).toBeNull();
    expect(parseClock("1:2:3")).toBeNull();
    expect(parseClock("1.5")).toBeNull();
  });
});

describe("formatClockInput", () => {
  it("writes a countdown as a clock", () => {
    expect(formatClockInput(140)).toBe("2:20");
    expect(formatClockInput(0)).toBe("0:00");
  });

  it("marks an overtime with a minus sign", () => {
    expect(formatClockInput(-40)).toBe("-0:40");
  });

  it("rounds to the second", () => {
    expect(formatClockInput(19.6)).toBe("0:20");
    expect(formatClockInput(-19.6)).toBe("-0:20");
  });
});

describe("elapsedForRemaining", () => {
  it("gives the time played that leaves that much on the clock", () => {
    expect(elapsedForRemaining(180, 140)).toBe(40);
    expect(elapsedForRemaining(180, 0)).toBe(180);
  });

  it("counts an overtime as time played past the turn", () => {
    expect(elapsedForRemaining(180, -40)).toBe(220);
  });

  it("floors at zero when asked for more time than the turn is long", () => {
    expect(elapsedForRemaining(180, 300)).toBe(0);
  });
});
