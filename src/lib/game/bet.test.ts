import { describe, expect, it } from "vitest";

import type { PlayerId, StageBet, StageScore } from "@/lib/domain";

import {
  betDone,
  betEntryError,
  betValues,
  betWin,
  betWon,
  tricksOff,
  withHedge,
} from "./bet";

const LUZ: StageBet = {
  win: 10,
  hedgedWin: 5,
  missPerTrick: 5,
  tricks: 3,
  hedgeLabel: "Jeton Sécurité",
};
const A = "a" as PlayerId;
const B = "b" as PlayerId;

describe("betValues", () => {
  it("offers every miss from the worst up, then the won bet of the manche", () => {
    expect(betValues(LUZ, 3, false)).toEqual([-15, -10, -5, 30]);
    expect(betValues(LUZ, 3, true)).toEqual([-15, -10, -5, 15]);
  });
});

describe("betWin", () => {
  it("pays the manche's number, at the token's rate when hedged", () => {
    expect(betWin(LUZ, 3, false)).toBe(30);
    expect(betWin(LUZ, 3, true)).toBe(15);
  });
});

describe("betWon and tricksOff", () => {
  it("reads a won bet off positive points, and a miss off the rest", () => {
    expect(betWon(20)).toBe(true);
    expect(betWon(-10)).toBe(false);
    expect(tricksOff(LUZ, -10)).toBe(2);
    expect(tricksOff(LUZ, 20)).toBe(0);
  });
});

describe("withHedge", () => {
  it("pays a won bet at the other rate, and leaves a miss alone", () => {
    expect(withHedge(LUZ, 3, 30, true)).toBe(15);
    expect(withHedge(LUZ, 3, 15, false)).toBe(30);
    expect(withHedge(LUZ, 3, -10, true)).toBe(-10);
    expect(withHedge(LUZ, 3, null, true)).toBeNull();
  });
});

describe("betEntryError", () => {
  it("accepts what the rules can pay", () => {
    expect(
      betEntryError(
        [
          { playerId: A, points: 40 },
          { playerId: B, points: 20, hedged: true },
        ],
        LUZ,
        4,
        "Donne",
      ),
    ).toBeNull();
  });

  it("refuses a won bet paid at the other rate", () => {
    expect(
      betEntryError(
        [{ playerId: A, points: 40, hedged: true }],
        LUZ,
        4,
        "Donne",
      ),
    ).toBe(
      "Donne 4 : 20 pour un pari réussi avec jeton sécurité, sinon −5 par pli d'écart.",
    );
    expect(betEntryError([{ playerId: A, points: 20 }], LUZ, 4, "Donne")).toBe(
      "Donne 4 : 40 pour un pari réussi, sinon −5 par pli d'écart.",
    );
  });

  it("refuses nothing at all, and a miss beyond the tricks", () => {
    expect(
      betEntryError([{ playerId: A, points: 0 }], LUZ, 1, "Donne"),
    ).not.toBeNull();
    expect(
      betEntryError([{ playerId: A, points: -20 }], LUZ, 1, "Donne"),
    ).not.toBeNull();
  });
});

describe("betDone", () => {
  const scores: StageScore[] = [
    { stage: 1, playerId: A, points: 10 },
    { stage: 2, playerId: A, points: -5 },
  ];

  it("stops once the last manche is written down", () => {
    expect(betDone(scores, 1, 2)).toBe(false);
    expect(betDone(scores, 2, 2)).toBe(true);
  });
});
