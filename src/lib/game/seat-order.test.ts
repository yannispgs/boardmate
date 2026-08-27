import { describe, expect, it } from "vitest";

import { canReorderSeats, seatingMatters } from "./seat-order";

describe("seatingMatters", () => {
  /** A boardgame, reduced to what reads a seat. */
  const bg = (over: Partial<Parameters<typeof seatingMatters>[0]> = {}) => ({
    turnMode: "sequential" as const,
    timed: true,
    trackSeatStats: false,
    scoring: { entry: "total" as const },
    ...over,
  });

  it("reads a seat on a game that hands the turn round", () => {
    expect(seatingMatters(bg())).toBe(true);
  });

  it("reads a seat on a game scored in shared piles", () => {
    // Splito: the seat *is* the score, so the seating stays correctable even
    // though the table plays at once and no turn is ever handed to anyone.
    const splito = bg({
      turnMode: "simultaneous",
      scoring: { entry: "pairs" },
    });

    expect(seatingMatters(splito)).toBe(true);
  });

  it("reads a seat on a game that keeps « first to play » figures", () => {
    expect(seatingMatters(bg({ timed: false, trackSeatStats: true }))).toBe(
      true,
    );
  });

  it("reads no seat on an untimed game scored on totals", () => {
    // Papayoo, Odin: no turn recorded, no pile shared, no seat statistic — the
    // seating is the order of the score sheet's rows and nothing else.
    expect(seatingMatters(bg({ timed: false }))).toBe(false);
  });

  it("reads no seat on an unscored game that times nothing", () => {
    expect(seatingMatters(bg({ timed: false, scoring: null }))).toBe(false);
  });
});

describe("canReorderSeats", () => {
  it("lets a table just launched be put back in the right order", () => {
    expect(canReorderSeats("sequential", 0)).toBe(true);
  });

  it("freezes a game that has already gone round seat by seat", () => {
    expect(canReorderSeats("sequential", 1)).toBe(false);
  });

  it("leaves a simultaneous game movable whatever has been played", () => {
    expect(canReorderSeats("simultaneous", 0)).toBe(true);
    expect(canReorderSeats("simultaneous", 12)).toBe(true);
  });
});
