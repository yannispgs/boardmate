import { describe, expect, it } from "vitest";

import { advanceTurn, isFinalTurn, turnPosition, turnsPerRound } from "./turn";

describe("turnsPerRound", () => {
  it("is one per player for sequential games", () => {
    expect(turnsPerRound("sequential", 4)).toBe(4);
  });

  it("is a single shared turn for simultaneous games", () => {
    expect(turnsPerRound("simultaneous", 4)).toBe(1);
  });
});

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

describe("isFinalTurn", () => {
  it("is true only on the last seat of the last round", () => {
    // 4 players, 20 rounds → the game ends on turn 80 (round 20, seat 3).
    expect(isFinalTurn(80, 4, 20)).toBe(true);
    expect(isFinalTurn(79, 4, 20)).toBe(false); // round 20, seat 2 — not last
    expect(isFinalTurn(77, 4, 20)).toBe(false); // round 20, seat 0
    expect(isFinalTurn(76, 4, 20)).toBe(false); // round 19, last seat
  });

  it("handles a one-round game and a solo game", () => {
    expect(isFinalTurn(2, 2, 1)).toBe(true); // 2 players, 1 round → turn 2
    expect(isFinalTurn(1, 2, 1)).toBe(false);
    expect(isFinalTurn(5, 1, 5)).toBe(true); // solo: round 5 is turn 5
  });

  it("is always false without a round limit", () => {
    expect(isFinalTurn(80, 4, null)).toBe(false);
    expect(isFinalTurn(1, 1, null)).toBe(false);
  });
});
