import { describe, expect, it } from "vitest";

import type { PlayerId, StageBet } from "@/lib/domain";

import {
  type BetManche,
  betFinished,
  betMancheScores,
  blankBetManche,
  patchBetManche,
} from "./bet-finished";

const LUZ: StageBet = {
  win: 10,
  hedgedWin: 5,
  missPerTrick: 5,
  tricks: 10,
  hedgeLabel: "Jeton Sécurité",
};
const A = "a" as PlayerId;
const B = "b" as PlayerId;

function manche(a: number, b: number, hedgedA = false): BetManche {
  return {
    [A]: { points: a, hedged: hedgedA },
    [B]: { points: b, hedged: false },
  };
}

describe("blankBetManche and patchBetManche", () => {
  it("starts empty, and moves a won bet to the token's rate", () => {
    const blank = blankBetManche([A, B]);

    expect(blank).toEqual({
      [A]: { points: null, hedged: false },
      [B]: { points: null, hedged: false },
    });

    const won = patchBetManche(blank, A, { points: 20 }, LUZ, 2);

    expect(won[A]).toEqual({ points: 20, hedged: false });
    expect(patchBetManche(won, A, { hedged: true }, LUZ, 2)[A]).toEqual({
      points: 10,
      hedged: true,
    });
    expect(patchBetManche({}, B, { hedged: true }, LUZ, 2)[B]).toEqual({
      points: null,
      hedged: true,
    });
  });
});

describe("betMancheScores", () => {
  it("numbers the donnes and keeps the token", () => {
    expect(betMancheScores([manche(5, -5, true)], [A, B])).toEqual([
      { stage: 1, playerId: A, points: 5, hedged: true },
      { stage: 1, playerId: B, points: -5, hedged: false },
    ]);
    expect(betMancheScores([{}], [A])).toEqual([
      { stage: 1, playerId: A, points: 0, hedged: false },
    ]);
  });
});

describe("betFinished", () => {
  it("asks for a donne, then for every cell, then for what the rules pay", () => {
    const empty = betFinished([A, B], [], LUZ, "Donne");

    expect(empty.error).toBe("Ajoutez au moins une donne.");
    expect(empty.scoreOf(A)).toBeNull();
    expect(
      betFinished([A, B], [blankBetManche([A, B])], LUZ, "Donne").error,
    ).toBe("Donne 1 : il manque les points de certains joueurs.");
    expect(betFinished([A, B], [manche(20, 10)], LUZ, "Donne")).toMatchObject({
      error: "Donne 1 : 10 pour un pari réussi, sinon −5 par pli d'écart.",
      candidates: [],
      asked: false,
    });
  });

  it("crowns the highest total", () => {
    const night = betFinished(
      [A, B],
      [manche(10, -5), manche(-10, 20)],
      LUZ,
      "Donne",
    );

    expect(night.error).toBeNull();
    expect(night.scoreOf(A)).toBe(0);
    expect(night.scoreOf(B)).toBe(15);
    expect(night.scoreOf("x" as PlayerId)).toBeNull();
    expect(night.preselected).toEqual([B]);
    expect(night.asked).toBe(false);
  });

  it("breaks a level total on the last donne, then asks", () => {
    const onLast = betFinished(
      [A, B],
      [manche(10, -15), manche(-5, 20)],
      LUZ,
      "Donne",
    );

    expect(onLast.preselected).toEqual([B]);

    const level = betFinished([A, B], [manche(10, 10)], LUZ, "Donne");

    expect(level).toMatchObject({
      candidates: [A, B],
      asked: true,
      tied: true,
      preselected: [],
    });
  });
});
