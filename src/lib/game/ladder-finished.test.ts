import { describe, expect, it } from "vitest";

import type { PlayerId } from "@/lib/domain";

import type { LadderEntryRules } from "./ladder";

import {
  blankManche,
  type LadderManche,
  ladderFinished,
  mancheScores,
  patchManche,
} from "./ladder-finished";

// The checks of an entry, without the floor of a whole hand — set apart below.
const RULES: LadderEntryRules = {
  fixed: false,
  step: 5,
  maxPoints: null,
  unclearedMin: 0,
};
const HAND = { ...RULES, unclearedMin: 50 };

const A = "a" as PlayerId;
const B = "b" as PlayerId;
const SEATS = [A, B];

function manche(a: [number, boolean], b: [number, boolean]): LadderManche {
  return {
    a: { points: a[0], cleared: a[1] },
    b: { points: b[0], cleared: b[1] },
  };
}

describe("blankManche and mancheScores", () => {
  it("leaves every cell unset, and numbers the manches from 1", () => {
    expect(blankManche(SEATS)).toEqual({
      a: { points: null, cleared: false },
      b: { points: null, cleared: false },
    });
    expect(
      mancheScores([manche([0, true], [20, false])], [A, B, "c" as PlayerId]),
    ).toEqual([
      { stage: 1, playerId: A, points: 0, cleared: true },
      { stage: 1, playerId: B, points: 20, cleared: false },
      { stage: 1, playerId: "c", points: 0, cleared: false },
    ]);
  });
});

describe("patchManche", () => {
  it("changes one player's line and keeps the rest", () => {
    const before = manche([0, true], [20, false]);

    expect(patchManche(before, B, { cleared: true }, RULES)).toEqual(
      manche([0, true], [20, true]),
    );
    expect(
      patchManche(before, "c" as PlayerId, { points: 5 }, RULES).c,
    ).toEqual({ points: 5, cleared: false });
  });

  it("leaves an unset cell unset when its phase is ticked or not", () => {
    const blank = blankManche(SEATS);

    expect(patchManche(blank, A, { cleared: true }, HAND).a).toEqual({
      points: null,
      cleared: true,
    });
    expect(
      patchManche(blank, "c" as PlayerId, { cleared: false }, HAND).c,
    ).toEqual({ points: null, cleared: false });
  });

  it("brings an unticked phase back up to a whole hand", () => {
    const ticked = manche([0, true], [15, true]);

    expect(patchManche(ticked, B, { cleared: false }, HAND).b).toEqual({
      points: 50,
      cleared: false,
    });
    expect(patchManche(ticked, B, { points: 70 }, HAND).b).toEqual({
      points: 70,
      cleared: true,
    });
  });
});

describe("ladderFinished — the totals alone", () => {
  it("asks the table who won, since the totals hold no climb", () => {
    const read = ladderFinished(
      "total",
      SEATS,
      { a: "40", b: "15" },
      [],
      10,
      RULES,
    );

    expect(read.error).toBeNull();
    expect(read.scoreOf(A)).toBe(40);
    expect(read.candidates).toEqual(SEATS);
    expect(read.asked).toBe(true);
    expect(read.preselected).toEqual([]);
    expect(read.stageScores).toEqual([]);
  });

  it("waits for every total", () => {
    const read = ladderFinished("total", SEATS, { a: "40" }, [], 10, RULES);

    expect(read.error).toBe("Il manque le score de certains joueurs.");
    expect(read.scoreOf(B)).toBeNull();
  });
});

describe("ladderFinished — the manches", () => {
  it("reads the winner off the climb, whatever the points", () => {
    const read = ladderFinished(
      "detail",
      SEATS,
      {},
      [manche([0, true], [5, false]), manche([60, true], [0, true])],
      2,
      RULES,
    );

    expect(read.error).toBeNull();
    expect(read.scoreOf(A)).toBe(60);
    expect(read.scoreOf(B)).toBe(5);
    expect(read.scoreOf("x" as PlayerId)).toBeNull();
    expect(read.asked).toBe(false);
    expect(read.preselected).toEqual([A]);
    expect(read.stageScores).toHaveLength(4);
  });

  it("asks among the level climbers on level points", () => {
    const read = ladderFinished(
      "detail",
      SEATS,
      {},
      [manche([0, true], [10, true]), manche([10, true], [0, true])],
      2,
      RULES,
    );

    expect(read.candidates).toEqual(SEATS);
    expect(read.asked).toBe(true);
    expect(read.tied).toBe(true);
  });

  it("waits for every cell of every manche", () => {
    const read = ladderFinished(
      "detail",
      SEATS,
      {},
      [manche([0, true], [60, false]), blankManche(SEATS)],
      10,
      RULES,
    );

    expect(read.error).toBe(
      "Manche 2 : il manque les points de certains joueurs.",
    );
  });

  it("says what is wrong, and in which manche", () => {
    expect(ladderFinished("detail", SEATS, {}, [], 10, RULES).error).toBe(
      "Ajoutez au moins une manche.",
    );

    const read = ladderFinished(
      "detail",
      SEATS,
      {},
      [manche([0, true], [5, false]), manche([10, false], [15, false])],
      10,
      RULES,
    );

    expect(read.error).toBe("Manche 2 : Un seul joueur doit finir à 0 point.");
    expect(read.scoreOf(A)).toBeNull();
    expect(read.asked).toBe(false);
  });

  it("waits for a player missing from a manche, as for an unset cell", () => {
    const read = ladderFinished(
      "detail",
      [A, B, "c" as PlayerId],
      {},
      [manche([0, true], [5, false])],
      10,
      RULES,
    );

    expect(read.error).toBe(
      "Manche 1 : il manque les points de certains joueurs.",
    );
  });
});
