import { describe, expect, it } from "vitest";

import { canReorderSeats } from "./seat-order";

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
