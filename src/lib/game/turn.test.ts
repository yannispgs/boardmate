import { describe, expect, it } from "vitest";

import { advanceTurn, turnPosition } from "./turn";

describe("turnPosition", () => {
  it("maps turns to seats within the first round", () => {
    expect(turnPosition(1, 3)).toEqual({ round: 1, seatIndex: 0 });
    expect(turnPosition(2, 3)).toEqual({ round: 1, seatIndex: 1 });
    expect(turnPosition(3, 3)).toEqual({ round: 1, seatIndex: 2 });
  });

  it("wraps to the next round after every seat has played", () => {
    expect(turnPosition(4, 3)).toEqual({ round: 2, seatIndex: 0 });
    expect(turnPosition(6, 3)).toEqual({ round: 2, seatIndex: 2 });
    expect(turnPosition(7, 3)).toEqual({ round: 3, seatIndex: 0 });
  });

  it("handles a single player (every turn is a new round)", () => {
    expect(turnPosition(1, 1)).toEqual({ round: 1, seatIndex: 0 });
    expect(turnPosition(5, 1)).toEqual({ round: 5, seatIndex: 0 });
  });

  it("rejects invalid arguments", () => {
    expect(() => turnPosition(0, 3)).toThrow();
    expect(() => turnPosition(1, 0)).toThrow();
    expect(() => turnPosition(1.5, 3)).toThrow();
  });
});

describe("advanceTurn", () => {
  it("increments the turn and recomputes round + seat", () => {
    expect(advanceTurn(1, 3)).toEqual({ turn: 2, round: 1, seatIndex: 1 });
    expect(advanceTurn(3, 3)).toEqual({ turn: 4, round: 2, seatIndex: 0 });
  });

  it("rolls around the table over several turns", () => {
    let turn = 1;
    const seats: number[] = [];
    for (let i = 0; i < 5; i++) {
      seats.push(turnPosition(turn, 2).seatIndex);
      turn = advanceTurn(turn, 2).turn;
    }
    expect(seats).toEqual([0, 1, 0, 1, 0]);
  });
});
