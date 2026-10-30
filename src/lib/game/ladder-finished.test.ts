import { describe, expect, it } from "vitest";

import type { PlayerId } from "@/lib/domain";

import {
  blankManche,
  type LadderManche,
  ladderFinished,
  mancheScores,
  patchManche,
} from "./ladder-finished";

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
  it("starts everybody on nothing, and numbers the manches from 1", () => {
    expect(blankManche(SEATS)).toEqual({
      a: { points: 0, cleared: false },
      b: { points: 0, cleared: false },
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

    expect(patchManche(before, B, { cleared: true })).toEqual(
      manche([0, true], [20, true]),
    );
    expect(patchManche(before, "c" as PlayerId, { points: 5 }).c).toEqual({
      points: 5,
      cleared: false,
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
      5,
    );

    expect(read.error).toBeNull();
    expect(read.scoreOf(A)).toBe(40);
    expect(read.candidates).toEqual(SEATS);
    expect(read.asked).toBe(true);
    expect(read.preselected).toEqual([]);
    expect(read.stageScores).toEqual([]);
  });

  it("waits for every total", () => {
    const read = ladderFinished("total", SEATS, { a: "40" }, [], 10, 5);

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
      5,
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
      5,
    );

    expect(read.candidates).toEqual(SEATS);
    expect(read.asked).toBe(true);
    expect(read.tied).toBe(true);
  });

  it("says what is wrong, and in which manche", () => {
    expect(ladderFinished("detail", SEATS, {}, [], 10, 5).error).toBe(
      "Ajoutez au moins une manche.",
    );

    const read = ladderFinished(
      "detail",
      SEATS,
      {},
      [manche([0, true], [5, false]), manche([10, false], [15, false])],
      10,
      5,
    );

    expect(read.error).toBe("Manche 2 : Un seul joueur doit finir à 0 point.");
    expect(read.scoreOf(A)).toBeNull();
    expect(read.asked).toBe(false);
  });

  it("reads a player missing from a manche as nothing in it", () => {
    const read = ladderFinished(
      "detail",
      [A, B, "c" as PlayerId],
      {},
      [manche([0, true], [5, false])],
      10,
      5,
    );

    expect(read.error).toBe("Manche 1 : Un seul joueur doit finir à 0 point.");
  });
});
