import { describe, expect, it } from "vitest";

import type { FieldSpec, PlayerId, StageScore, StageSpec } from "@/lib/domain";

import {
  type LadderEntryRules,
  ladderClimb,
  ladderDone,
  ladderEntryError,
  ladderFinalStandings,
  ladderFixedOn,
  ladderOutcome,
  ladderRows,
  ladderRungs,
  ladderSeries,
  ladderStandings,
  ladderWheel,
  pointsFloor,
  workingRung,
} from "./ladder";

const A = "a" as PlayerId;
const B = "b" as PlayerId;
const C = "c" as PlayerId;
const SEATS = [A, B, C];

function line(
  stage: number,
  playerId: PlayerId,
  points: number,
  cleared = false,
): StageScore {
  return { stage, playerId, points, cleared };
}

// Three manches on a three-rung ladder: A clears every time and goes out on the
// third; B clears the first two; C only the first.
const SCORES: StageScore[] = [
  line(1, A, 0, true),
  line(1, B, 20, true),
  line(1, C, 35, true),
  line(2, A, 10, true),
  line(2, B, 0, true),
  line(2, C, 40),
  line(3, A, 0, true),
  line(3, B, 15),
  line(3, C, 5),
];

describe("ladderFixedOn", () => {
  const stages: StageSpec = {
    label: "Manche",
    advance: "manual",
    ladder: { label: "Phase", steps: ["x", "y"], fixedKey: "fixedStages" },
  };
  const fields = [
    { key: "fixedStages", label: "Variante", type: "boolean", default: false },
  ] as FieldSpec[];

  it("follows the value chosen at launch, else the template's default", () => {
    expect(ladderFixedOn(stages, { fixedStages: true }, fields)).toBe(true);
    expect(ladderFixedOn(stages, { fixedStages: false }, fields)).toBe(false);
    expect(ladderFixedOn(stages, null, fields)).toBe(false);
  });

  it("is never on without a ladder, or for a ladder with no variant", () => {
    expect(ladderFixedOn(null, { fixedStages: true }, fields)).toBe(false);
    expect(
      ladderFixedOn(
        { ...stages, ladder: { label: "Phase", steps: ["x"] } },
        { fixedStages: true },
        fields,
      ),
    ).toBe(false);
  });
});

describe("ladderRungs", () => {
  it("counts the rungs cleared up to a manche", () => {
    expect(ladderRungs(SEATS, SCORES, 2, 3, false)).toEqual({
      a: 2,
      b: 2,
      c: 1,
    });
  });

  it("never climbs past the top", () => {
    expect(ladderRungs(SEATS, SCORES, 3, 2, false)).toEqual({
      a: 2,
      b: 2,
      c: 1,
    });
  });

  it("moves everybody up every manche in the variant", () => {
    expect(ladderRungs(SEATS, SCORES, 2, 10, true)).toEqual({
      a: 2,
      b: 2,
      c: 2,
    });
  });
});

describe("workingRung", () => {
  it("is the next rung, and stays on the top one once it is cleared", () => {
    expect(workingRung(0, 10)).toBe(1);
    expect(workingRung(4, 10)).toBe(5);
    expect(workingRung(10, 10)).toBe(10);
  });
});

describe("ladderClimb", () => {
  it("draws each player's climb manche by manche", () => {
    expect(ladderClimb([A, C], SCORES, 3, false)).toEqual([
      { stage: 1, rungs: { a: 1, c: 1 } },
      { stage: 2, rungs: { a: 2, c: 1 } },
      { stage: 3, rungs: { a: 3, c: 1 } },
    ]);
  });
});

describe("ladderSeries", () => {
  it("draws one step line per player, from the ground up", () => {
    expect(ladderSeries([A, C], SCORES, 3, false)).toEqual([
      {
        playerId: A,
        points: [
          { x: 0, score: 0 },
          { x: 1 / 3, score: 1 },
          { x: 2 / 3, score: 2 },
          { x: 1, score: 3 },
        ],
      },
      {
        playerId: C,
        points: [
          { x: 0, score: 0 },
          { x: 1 / 3, score: 1 },
          { x: 2 / 3, score: 1 },
          { x: 1, score: 1 },
        ],
      },
    ]);
  });
});

describe("ladderDone", () => {
  it("stops once somebody clears the top rung", () => {
    expect(ladderDone(SEATS, SCORES, 2, 3, false)).toBe(false);
    expect(ladderDone(SEATS, SCORES, 3, 3, false)).toBe(true);
  });

  it("stops the variant once every rung has had its manche", () => {
    expect(ladderDone(SEATS, SCORES, 2, 3, true)).toBe(false);
    expect(ladderDone(SEATS, SCORES, 3, 3, true)).toBe(true);
  });
});

describe("ladderStandings", () => {
  it("ranks the climb first, then the fewest points", () => {
    expect(ladderStandings(SEATS, SCORES, 3, 3, false)).toEqual([
      { playerId: A, rungs: 3, total: 10, points: 0, rank: 1 },
      { playerId: B, rungs: 2, total: 35, points: 15, rank: 2 },
      { playerId: C, rungs: 1, total: 80, points: 5, rank: 3 },
    ]);
  });

  it("shares a rank between players level on both, and has no line for a missing manche", () => {
    const level = [line(1, A, 0, true), line(1, B, 0, true)];

    expect(ladderStandings([A, B, C], level, 1, 3, false)).toEqual([
      { playerId: A, rungs: 1, total: 0, points: 0, rank: 1 },
      { playerId: B, rungs: 1, total: 0, points: 0, rank: 1 },
      { playerId: C, rungs: 0, total: 0, points: null, rank: 3 },
    ]);
  });
});

describe("ladderEntryError", () => {
  const RULES: LadderEntryRules = {
    fixed: false,
    step: 5,
    maxPoints: 190,
    unclearedMin: 50,
  };

  it("accepts one player out on a cleared phase, the others in fives", () => {
    expect(
      ladderEntryError(
        [
          { playerId: A, points: 0, cleared: true },
          { playerId: B, points: 25, cleared: true },
          { playerId: C, points: 55 },
        ],
        RULES,
      ),
    ).toBeNull();
  });

  it("keeps Odin's checks", () => {
    expect(
      ladderEntryError(
        [
          { playerId: A, points: 55 },
          { playerId: B, points: 60 },
        ],
        RULES,
      ),
    ).toBe("Un seul joueur doit finir à 0 point.");
    expect(
      ladderEntryError(
        [
          { playerId: A, points: 0, cleared: true },
          { playerId: B, points: 195 },
        ],
        RULES,
      ),
    ).toBe("Une manche ne peut pas rapporter plus de 190 points.");
  });

  it("refuses points that are not a multiple of 5", () => {
    expect(
      ladderEntryError(
        [
          { playerId: A, points: 0, cleared: true },
          { playerId: B, points: 52 },
        ],
        RULES,
      ),
    ).toBe("Les points d'une manche vont de 5 en 5.");
  });

  it("refuses a player out without his phase, except in the variant", () => {
    const out = [
      { playerId: A, points: 0 },
      { playerId: B, points: 60 },
    ];

    expect(ladderEntryError(out, RULES)).toBe(
      "Celui qui finit la manche a forcément posé sa phase.",
    );
    expect(ladderEntryError(out, { ...RULES, fixed: true })).toBeNull();
  });

  it("refuses less than a whole hand to a player without his phase", () => {
    expect(
      ladderEntryError(
        [
          { playerId: A, points: 0, cleared: true },
          { playerId: B, points: 45 },
        ],
        RULES,
      ),
    ).toBe(
      "Sans sa phase posée, on garde toutes ses cartes : au moins 50 points.",
    );
  });
});

describe("pointsFloor", () => {
  const RULES: LadderEntryRules = {
    fixed: false,
    step: 5,
    maxPoints: 190,
    unclearedMin: 50,
  };

  it("holds a player without his phase to a whole hand", () => {
    expect(pointsFloor(false, RULES)).toBe(50);
    expect(pointsFloor(true, RULES)).toBe(0);
    expect(pointsFloor(false, { ...RULES, fixed: true })).toBe(0);
  });
});

describe("ladderWheel", () => {
  const RULES: LadderEntryRules = {
    fixed: false,
    step: 5,
    maxPoints: 20,
    unclearedMin: 10,
  };

  it("runs from the floor to the cap, a step apart", () => {
    expect(ladderWheel(false, RULES)).toEqual([10, 15, 20]);
    expect(ladderWheel(true, RULES)).toEqual([0, 5, 10, 15, 20]);
  });

  it("stops somewhere on a game that caps nothing", () => {
    expect(ladderWheel(true, { ...RULES, maxPoints: null }).at(-1)).toBe(250);
  });
});

describe("ladderOutcome", () => {
  it("crowns whoever cleared the top rung, whatever the others' points", () => {
    const outcome = ladderOutcome(SEATS, SCORES, 3, false);

    expect(outcome.winners).toEqual([A]);
    expect(outcome.contenders).toEqual([A]);
    expect(outcome.ranking.map(r => r.playerId)).toEqual([A, B, C]);
    expect(outcome.scores).toEqual([
      { playerId: A, score: 10 },
      { playerId: B, score: 35 },
      { playerId: C, score: 80 },
    ]);
  });

  it("separates two who cleared it on their points", () => {
    const outcome = ladderOutcome(SEATS, SCORES, 2, false);

    expect(outcome.contenders).toEqual([A, B]);
    expect(outcome.winners).toEqual([A]);
  });

  it("crowns nobody yet while those two are level on points", () => {
    const level = [line(1, A, 0, true), line(1, B, 0, true), line(1, C, 5)];
    const outcome = ladderOutcome(SEATS, level, 1, false);

    expect(outcome.contenders).toEqual([A, B]);
    expect(outcome.winners).toEqual([]);
  });

  it("reads the variant on the points alone", () => {
    const outcome = ladderOutcome(SEATS, SCORES, 3, true);

    expect(outcome.contenders).toEqual(SEATS);
    expect(outcome.winners).toEqual([A]);
    expect(outcome.ranking.map(r => r.playerId)).toEqual([A, B, C]);
  });
});

describe("ladderFinalStandings", () => {
  it("puts the winner first, then the climb, then the points", () => {
    expect(ladderFinalStandings(SEATS, [A], SCORES, 3, false)).toEqual([
      { playerId: A, total: 10, rank: 1, rungs: 3 },
      { playerId: B, total: 35, rank: 2, rungs: 2 },
      { playerId: C, total: 80, rank: 3, rungs: 1 },
    ]);
  });

  it("ranks the co-leader who lost the replay 2nd", () => {
    const level = [line(1, A, 0, true), line(1, B, 0, true), line(1, C, 10)];
    const four = [...SEATS, "d" as PlayerId];

    expect(ladderFinalStandings(four, [A], level, 1, false)).toEqual([
      { playerId: A, total: 0, rank: 1, rungs: 1 },
      { playerId: B, total: 0, rank: 2, rungs: 1 },
      { playerId: "d", total: 0, rank: 3, rungs: 0 },
      { playerId: C, total: 10, rank: 4, rungs: 0 },
    ]);
  });

  it("crowns every winner of a shared victory first, and shares a level place", () => {
    const shared = [line(1, A, 0, true), line(1, B, 0, true)];
    const four = [...SEATS, "d" as PlayerId];
    const ranked = ladderFinalStandings(four, [A, B], shared, 1, false);

    expect(ranked.map(r => r.rank)).toEqual([1, 1, 3, 3]);
  });
});

describe("ladderRows", () => {
  it("tags each manche with the rung a player cleared in it", () => {
    expect(ladderRows([A, C, "d" as PlayerId], SCORES, 3, false)).toEqual([
      {
        stage: 1,
        cells: {
          a: { points: 0, cleared: 1 },
          c: { points: 35, cleared: 1 },
          d: { points: null, cleared: null },
        },
      },
      {
        stage: 2,
        cells: {
          a: { points: 10, cleared: 2 },
          c: { points: 40, cleared: null },
          d: { points: null, cleared: null },
        },
      },
      {
        stage: 3,
        cells: {
          a: { points: 0, cleared: 3 },
          c: { points: 5, cleared: null },
          d: { points: null, cleared: null },
        },
      },
    ]);
  });

  it("tags nothing past the top, nor in the variant", () => {
    expect(ladderRows([A], SCORES, 2, false)[2].cells.a.cleared).toBeNull();
    expect(ladderRows([A], SCORES, 3, true)[0].cells.a.cleared).toBeNull();
  });
});
