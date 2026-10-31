import { describe, expect, it } from "vitest";

import type {
  BoardgameId,
  GameId,
  GameStatsRecord,
  PlayerId,
  StageScore,
  StageSpec,
} from "@/lib/domain";

import {
  extraDirection,
  extraMarks,
  extraRecordsTaken,
  ladderRunOf,
  ladderRuns,
} from "./ladder-records";

const GAME = "bg-p10" as BoardgameId;
const A = "a" as PlayerId;
const B = "b" as PlayerId;

const STAGES: StageSpec = {
  label: "Manche",
  advance: "manual",
  ladder: { label: "Phase", steps: ["x", "y"], fixedKey: "fixedStages" },
};

// Two rungs: A clears both and wins on manche 2; B clears one.
const CLIMB: StageScore[] = [
  { stage: 1, playerId: A, points: 0, cleared: true },
  { stage: 1, playerId: B, points: 30, cleared: true },
  { stage: 2, playerId: A, points: 0, cleared: true },
  { stage: 2, playerId: B, points: 45 },
];

function party(
  id: string,
  scores: StageScore[],
  fields: Partial<GameStatsRecord> = {},
  winnerScore = 0,
): GameStatsRecord {
  return {
    gameId: id as GameId,
    boardgameId: GAME,
    stageScores: scores,
    extensions: [],
    players: [
      { playerId: A, name: "Ann", isWinner: true, score: winnerScore },
      { playerId: B, name: "Bob", isWinner: false, score: 75 },
    ],
    ...fields,
  } as GameStatsRecord;
}

describe("ladderRunOf", () => {
  const base = {
    gameId: "g" as GameId,
    boardgameId: GAME,
    playerIds: [A, B],
    scores: CLIMB,
    fixed: false,
    extensions: [],
    winners: [A],
  };

  it("counts the manches it took to clear the top rung", () => {
    expect(ladderRunOf(STAGES, base)).toEqual({
      gameId: "g",
      boardgameId: GAME,
      rounds: 2,
      playerCount: 2,
      target: 2,
      setup: "",
      winners: [A],
      course: "ladder",
    });
  });

  it("is no race on a game with no ladder, nor in the variant", () => {
    expect(ladderRunOf(null, base)).toBeNull();
    expect(ladderRunOf(STAGES, { ...base, fixed: true })).toBeNull();
  });

  it("is no race when the winner never cleared the top rung", () => {
    expect(ladderRunOf(STAGES, { ...base, winners: [B] })).toBeNull();
  });
});

describe("ladderRuns", () => {
  it("reads the parties of this game only, the variant left out", () => {
    const runs = ladderRuns(STAGES, GAME, [
      party("one", CLIMB),
      party("fixed", CLIMB, { ladderFixed: true }),
      party("other", CLIMB, { boardgameId: "bg-x" as BoardgameId }),
      party("bare", CLIMB, { stageScores: undefined, extensions: undefined }),
    ]);

    expect(runs.map(run => run.gameId)).toEqual(["one"]);
  });
});

describe("extraMarks and extraDirection", () => {
  it("reads every manche for the heaviest one, the most points best", () => {
    expect(extraDirection("heaviestStage")).toBe("highest");
    expect(extraMarks("heaviestStage", party("p", CLIMB))).toEqual([
      { playerId: A, value: 0, stage: 1 },
      { playerId: B, value: 30, stage: 1 },
      { playerId: A, value: 0, stage: 2 },
      { playerId: B, value: 45, stage: 2 },
    ]);
    expect(
      extraMarks("heaviestStage", party("p", [], { stageScores: undefined })),
    ).toEqual([]);
  });

  it("reads the winners' totals for the smallest win, the fewest best", () => {
    expect(extraDirection("lowestWin")).toBe("lowest");
    expect(extraMarks("lowestWin", party("p", CLIMB, {}, 20))).toEqual([
      { playerId: A, value: 20, stage: null },
    ]);
  });

  it("leaves out a winner with no score", () => {
    const unscored = party("p", CLIMB);

    unscored.players[0].score = null;

    expect(extraMarks("lowestWin", unscored)).toEqual([]);
  });
});

describe("extraRecordsTaken", () => {
  const before = party("old", CLIMB, {}, 40);

  it("announces a mark beaten, against the same game and setup", () => {
    const heavy = party(
      "new",
      [...CLIMB, { stage: 3, playerId: B, points: 90 }],
      {},
      10,
    );
    const elsewhere = party("x", [{ stage: 1, playerId: A, points: 200 }], {
      boardgameId: "bg-x" as BoardgameId,
    });

    expect(
      extraRecordsTaken(
        ["heaviestStage", "lowestWin"],
        heavy,
        [before, elsewhere, heavy],
        false,
      ),
    ).toEqual([
      {
        record: "heaviestStage",
        mark: { playerId: B, value: 90, stage: 3 },
        previous: 45,
      },
      {
        record: "lowestWin",
        mark: { playerId: A, value: 10, stage: null },
        previous: 40,
      },
    ]);
  });

  it("reads the best of several standing marks as the one to beat", () => {
    const later = party("later", CLIMB, {}, 50);
    const win = party("win", CLIMB, {}, 30);

    expect(
      extraRecordsTaken(["lowestWin"], win, [before, later], false),
    ).toEqual([
      {
        record: "lowestWin",
        mark: { playerId: A, value: 30, stage: null },
        previous: 40,
      },
    ]);
  });

  it("announces nothing for an equalled mark, nor for a first party", () => {
    const same = party("same", CLIMB, {}, 40);

    expect(
      extraRecordsTaken(["heaviestStage", "lowestWin"], same, [before], false),
    ).toEqual([]);
    expect(extraRecordsTaken(["lowestWin"], same, [], false)).toEqual([]);
  });

  it("compares only tables of the same size where the game says so", () => {
    const three = party("three", CLIMB, {}, 5);

    three.players.push({
      playerId: "c" as PlayerId,
      name: "Cid",
      isWinner: false,
      score: 50,
    } as GameStatsRecord["players"][number]);

    expect(extraRecordsTaken(["lowestWin"], three, [before], true)).toEqual([]);
    expect(extraRecordsTaken(["lowestWin"], three, [before], false)).toEqual([
      {
        record: "lowestWin",
        mark: { playerId: A, value: 5, stage: null },
        previous: 40,
      },
    ]);
  });

  it("keeps parties played with other extensions apart", () => {
    const marins = party(
      "m",
      CLIMB,
      {
        extensions: [
          { name: "Marins", scenarioName: null } as NonNullable<
            GameStatsRecord["extensions"]
          >[number],
        ],
      },
      5,
    );

    expect(extraRecordsTaken(["lowestWin"], marins, [before], false)).toEqual(
      [],
    );
  });
});
