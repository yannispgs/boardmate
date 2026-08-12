import { describe, expect, it } from "vitest";

import type {
  GameStatsRecord,
  PlayerId,
  RoundGoal,
  StageGoalRecord,
} from "@/lib/domain";

import { goalStats } from "./goal-stats";

const A = "a" as PlayerId;
const B = "b" as PlayerId;

const CATALOGUE: RoundGoal[] = [
  {
    key: "eggsInHabitat",
    label: "Œufs dans {habitat}",
    params: [
      {
        key: "habitat",
        label: "Écosystème",
        options: [
          { value: "forest", label: "Forêt" },
          { value: "sea", label: "Mer" },
        ],
      },
    ],
  },
  { key: "totalBirds", label: "Oiseaux au total", params: [] },
];

function record(stageGoals: StageGoalRecord[]): GameStatsRecord {
  return {
    gameId: "g" as GameStatsRecord["gameId"],
    boardgameId: "b" as GameStatsRecord["boardgameId"],
    boardgameName: "Wingspan",
    dice: null,
    endedAt: null,
    players: [],
    turns: [],
    diceRolls: [],
    stageGoals,
  };
}

/** One manche: its tile, its values, and what each player took from it. */
function stage(
  goalKey: string,
  goalParams: Record<string, string>,
  points: Array<{ playerId: PlayerId; points: number }>,
): StageGoalRecord {
  return { stage: 1, goalKey, goalParams, points };
}

describe("goalStats", () => {
  const played = [
    record([
      stage("eggsInHabitat", { habitat: "sea" }, [
        { playerId: A, points: 2 },
        { playerId: B, points: 0 },
      ]),
      stage("totalBirds", {}, [
        { playerId: A, points: 7 },
        { playerId: B, points: 5 },
      ]),
    ]),
    record([
      stage("eggsInHabitat", { habitat: "forest" }, [
        { playerId: A, points: 6 },
        { playerId: B, points: 4 },
      ]),
    ]),
  ];

  it("pools a family under its hole-punched title", () => {
    expect(goalStats(played, CATALOGUE, false)).toEqual([
      {
        id: "totalBirds",
        label: "Oiseaux au total",
        played: 1,
        avgPoints: 6,
        bestPoints: 7,
      },
      {
        id: "eggsInHabitat",
        label: "Œufs dans X",
        played: 2,
        avgPoints: 3,
        bestPoints: 6,
      },
    ]);
  });

  it("splits a family by the values it was set up with", () => {
    const rows = goalStats(played, CATALOGUE, true);

    expect(rows.map(r => r.label)).toEqual([
      "Oiseaux au total",
      "Œufs dans Forêt",
      "Œufs dans Mer",
    ]);
    expect(rows.map(r => r.avgPoints)).toEqual([6, 5, 1]);
  });

  it("drops a tile the catalogue no longer offers", () => {
    const gone = [
      record([stage("nectarBonus", {}, [{ playerId: A, points: 9 }])]),
    ];

    expect(goalStats(gone, CATALOGUE, false)).toEqual([]);
  });

  it("scores a tile nobody took anything from as zero", () => {
    const blank = [record([stage("totalBirds", {}, [])])];

    expect(goalStats(blank, CATALOGUE, false)).toEqual([
      {
        id: "totalBirds",
        label: "Oiseaux au total",
        played: 1,
        avgPoints: 0,
        bestPoints: 0,
      },
    ]);
  });

  it("puts two tiles that paid the same in alphabetical order", () => {
    const tied = [
      record([
        stage("totalBirds", {}, [{ playerId: A, points: 3 }]),
        stage("eggsInHabitat", { habitat: "sea" }, [
          { playerId: A, points: 3 },
        ]),
      ]),
    ];

    // « Œufs » files under « Oe », so it comes before « Oiseaux ».
    expect(goalStats(tied, CATALOGUE, false).map(r => r.label)).toEqual([
      "Œufs dans X",
      "Oiseaux au total",
    ]);
  });

  it("ignores games that played no manche at all", () => {
    const laps = { ...record([]), stageGoals: undefined };

    expect(goalStats([laps], CATALOGUE, false)).toEqual([]);
  });
});
