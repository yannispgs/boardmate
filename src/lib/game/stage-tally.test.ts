import { describe, expect, it } from "vitest";

import type { PlayerId, StageScore, StageSpec } from "@/lib/domain";

import {
  closedStages,
  lastStageReached,
  stageEntryError,
  stageFinalScores,
  stageLimit,
  stageStandings,
  stopReached,
} from "./stage-tally";

/** Odin: one player goes out, and a hand holds nine points at most. */
const ODIN: StageSpec = {
  label: "Manche",
  advance: "manual",
  maxPoints: 9,
  singleExit: true,
};

/** Papayoo: nobody goes out, and the table always shares out 250 points. */
const PAPAYOO: StageSpec = {
  label: "Manche",
  advance: "manual",
  maxPoints: 250,
  stageTotal: 250,
  stagesPerPlayer: 1,
};

const A = "a" as PlayerId;
const B = "b" as PlayerId;
const C = "c" as PlayerId;

const SEATS = [A, B, C];

/** Two manches: A goes out first, then C — B never does. */
const SCORES: StageScore[] = [
  { stage: 1, playerId: A, points: 0 },
  { stage: 1, playerId: B, points: 4 },
  { stage: 1, playerId: C, points: 7 },
  { stage: 2, playerId: A, points: 3 },
  { stage: 2, playerId: B, points: 5 },
  { stage: 2, playerId: C, points: 0 },
];

describe("stageEntryError", () => {
  it("accepts one player out and the others holding cards", () => {
    expect(
      stageEntryError(
        [
          { playerId: A, points: 0 },
          { playerId: B, points: 4 },
        ],
        ODIN,
      ),
    ).toBeNull();
  });

  it("refuses a manche nobody went out of", () => {
    expect(
      stageEntryError(
        [
          { playerId: A, points: 2 },
          { playerId: B, points: 4 },
        ],
        ODIN,
      ),
    ).toBe("Un seul joueur doit finir à 0 point.");
  });

  it("refuses two players going out at once", () => {
    expect(
      stageEntryError(
        [
          { playerId: A, points: 0 },
          { playerId: B, points: 0 },
        ],
        ODIN,
      ),
    ).toBe("Un seul joueur doit finir à 0 point.");
  });

  it("refuses negative points", () => {
    expect(
      stageEntryError(
        [
          { playerId: A, points: 0 },
          { playerId: B, points: -2 },
        ],
        ODIN,
      ),
    ).toBe("Les points d'une manche ne peuvent pas être négatifs.");
  });

  it("refuses more points than a hand can hold", () => {
    expect(
      stageEntryError(
        [
          { playerId: A, points: 0 },
          { playerId: B, points: 12 },
        ],
        ODIN,
      ),
    ).toBe("Une manche ne peut pas rapporter plus de 9 points.");
  });

  it("lets any total through when the rules cap nothing", () => {
    expect(
      stageEntryError(
        [
          { playerId: A, points: 0 },
          { playerId: B, points: 40 },
        ],
        null,
      ),
    ).toBeNull();
  });

  it("says nothing about an empty table", () => {
    expect(stageEntryError([], ODIN)).toBeNull();
  });

  it("accepts several players at 0 when nobody goes out", () => {
    expect(
      stageEntryError(
        [
          { playerId: A, points: 0 },
          { playerId: B, points: 0 },
          { playerId: C, points: 250 },
        ],
        PAPAYOO,
      ),
    ).toBeNull();
  });

  it("refuses a manche that doesn't add up, and says what it adds up to", () => {
    expect(
      stageEntryError(
        [
          { playerId: A, points: 40 },
          { playerId: B, points: 90 },
        ],
        PAPAYOO,
      ),
    ).toBe("Le total de la manche doit faire 250 points (actuellement 130).");
  });

  it("checks the cap before the total, being the more precise complaint", () => {
    expect(
      stageEntryError(
        [
          { playerId: A, points: 300 },
          { playerId: B, points: 0 },
        ],
        PAPAYOO,
      ),
    ).toBe("Une manche ne peut pas rapporter plus de 250 points.");
  });
});

describe("stageLimit", () => {
  it("counts one manche per player at the table", () => {
    expect(stageLimit(PAPAYOO, 5)).toBe(5);
  });

  it("leaves a game nothing but its tally stops open-ended", () => {
    expect(stageLimit(ODIN, 5)).toBeNull();
    expect(stageLimit(null, 5)).toBeNull();
  });
});

describe("lastStageReached", () => {
  const STANDINGS = stageStandings(SEATS, SCORES, 2, "lowest");

  it("stops a counted game on its last manche, buried or not", () => {
    expect(lastStageReached(STANDINGS, 4, null, 5)).toBe(false);
    expect(lastStageReached(STANDINGS, 5, null, 5)).toBe(true);
  });

  it("stops a targeted game as soon as a total crosses the target", () => {
    expect(lastStageReached(STANDINGS, 2, 15, null)).toBe(false);
    expect(lastStageReached(STANDINGS, 2, 9, null)).toBe(true);
  });

  it("never stops a game with neither a count nor a target", () => {
    expect(lastStageReached(STANDINGS, 99, null, null)).toBe(false);
  });
});

describe("closedStages", () => {
  it("lists the manches left behind, oldest first, with their points", () => {
    expect(closedStages(SCORES, 3)).toEqual([
      { stage: 1, points: { a: 0, b: 4, c: 7 } },
      { stage: 2, points: { a: 3, b: 5, c: 0 } },
    ]);
  });

  it("leaves out the manche being played and anything after it", () => {
    expect(closedStages(SCORES, 2)).toEqual([
      { stage: 1, points: { a: 0, b: 4, c: 7 } },
    ]);
    expect(closedStages(SCORES, 1)).toEqual([]);
  });
});

describe("stageStandings", () => {
  it("sums the manches played so far, lowest first", () => {
    expect(stageStandings(SEATS, SCORES, 2, "lowest")).toEqual([
      { playerId: A, total: 3, rank: 1, points: 3 },
      { playerId: C, total: 7, rank: 2, points: 0 },
      { playerId: B, total: 9, rank: 3, points: 5 },
    ]);
  });

  it("ignores the manches after the one being read", () => {
    expect(stageStandings(SEATS, SCORES, 1, "lowest")).toEqual([
      { playerId: A, total: 0, rank: 1, points: 0 },
      { playerId: B, total: 4, rank: 2, points: 4 },
      { playerId: C, total: 7, rank: 3, points: 7 },
    ]);
  });

  it("leaves a player with no line for that manche unscored", () => {
    const [first] = stageStandings([A], [], 1, "lowest");

    expect(first).toEqual({ playerId: A, total: 0, rank: 1, points: null });
  });

  it("ranks the other way round when the highest total wins", () => {
    expect(
      stageStandings(SEATS, SCORES, 2, "highest").map(s => s.playerId),
    ).toEqual([B, C, A]);
  });
});

describe("stopReached", () => {
  const standings = stageStandings(SEATS, SCORES, 2, "lowest");

  it("stops once a total reaches the target", () => {
    expect(stopReached(standings, 9)).toBe(true);
  });

  it("carries on while everyone is still short of it", () => {
    expect(stopReached(standings, 10)).toBe(false);
  });
});

describe("stageFinalScores", () => {
  it("hands over each player's manches summed", () => {
    expect(stageFinalScores(SEATS, SCORES)).toEqual([
      { playerId: A, score: 3 },
      { playerId: B, score: 9 },
      { playerId: C, score: 7 },
    ]);
  });

  it("scores a player who never took a point at zero", () => {
    expect(stageFinalScores([A], [])).toEqual([{ playerId: A, score: 0 }]);
  });
});
