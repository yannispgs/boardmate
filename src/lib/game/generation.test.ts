import { describe, expect, it } from "vitest";

import {
  activeSeat,
  generationOver,
  nextActiveSeat,
  openingSeat,
} from "./generation";

const out = (...seats: number[]) => new Set(seats);

describe("openingSeat", () => {
  it("moves the first-player marker one seat along each generation", () => {
    expect(openingSeat(1, 4)).toBe(0);
    expect(openingSeat(2, 4)).toBe(1);
    expect(openingSeat(4, 4)).toBe(3);
  });

  it("wraps the marker back to the first seat", () => {
    expect(openingSeat(5, 4)).toBe(0);
    expect(openingSeat(6, 4)).toBe(1);
  });

  it("refuses a generation or a table that cannot exist", () => {
    expect(() => openingSeat(0, 4)).toThrow("stage");
    expect(() => openingSeat(1.5, 4)).toThrow("stage");
    expect(() => openingSeat(1, 0)).toThrow("seatCount");
  });
});

describe("nextActiveSeat", () => {
  it("hands over to the neighbour when nobody is out", () => {
    expect(nextActiveSeat(0, 4, out())).toBe(1);
    expect(nextActiveSeat(2, 4, out())).toBe(3);
  });

  it("wraps around the table", () => {
    expect(nextActiveSeat(3, 4, out())).toBe(0);
  });

  it("skips over everyone who has passed", () => {
    expect(nextActiveSeat(0, 4, out(1, 2))).toBe(3);
    expect(nextActiveSeat(2, 4, out(3, 0))).toBe(1);
  });

  it("comes back to the only player left in", () => {
    expect(nextActiveSeat(1, 4, out(0, 2, 3))).toBe(1);
  });

  it("gives nobody once the whole table has passed", () => {
    expect(nextActiveSeat(2, 4, out(0, 1, 2, 3))).toBeNull();
  });

  it("refuses a table that cannot exist", () => {
    expect(() => nextActiveSeat(0, 0, out())).toThrow("seatCount");
  });
});

describe("activeSeat", () => {
  it("opens the generation on its first-player marker", () => {
    expect(activeSeat(1, 4, null, out())).toBe(0);
    expect(activeSeat(3, 4, null, out())).toBe(2);
  });

  it("skips the marker when that player is already out", () => {
    expect(activeSeat(2, 4, null, out(1))).toBe(2);
  });

  it("hands over to the next player still in after the last turn", () => {
    expect(activeSeat(1, 4, 0, out())).toBe(1);
    expect(activeSeat(1, 4, 0, out(1, 2))).toBe(3);
  });

  it("gives nobody once everyone has passed", () => {
    expect(activeSeat(1, 3, 2, out(0, 1, 2))).toBeNull();
  });
});

describe("generationOver", () => {
  it("is over only once every seat is out", () => {
    expect(generationOver(3, out(0, 1))).toBe(false);
    expect(generationOver(3, out(0, 1, 2))).toBe(true);
  });

  it("refuses a table that cannot exist", () => {
    expect(() => generationOver(0, out())).toThrow("seatCount");
  });
});
