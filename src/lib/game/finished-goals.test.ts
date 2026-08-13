import { describe, expect, it } from "vitest";

import type { PlayerId, RoundGoal } from "@/lib/domain";

import {
  finishedGoals,
  mergeCells,
  type StageGoalRaw,
  stageGoalSheet,
  stageKey,
  unscoredStageCells,
  unscoredStageKeys,
} from "./finished-goals";
import { stageCalendar } from "./stage";

const WINGSPAN = [8, 7, 6, 5];

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
  { key: "cheapBirds", label: "Oiseaux à faible coût", params: [] },
  {
    key: "noGoal",
    label: "Pas d'objectif",
    params: [],
    scores: false,
    extraTurn: 1,
  },
];

function pick(goalKey: string, goalParams: Record<string, string> = {}) {
  return { goalKey, goalParams };
}

/** The four tiles of a complete Wingspan calendar, none of them free. */
const FULL_PICKS = [
  pick("eggsInHabitat", { habitat: "sea" }),
  pick("totalBirds"),
  pick("cheapBirds"),
  pick("eggsInHabitat", { habitat: "forest" }),
];

/** Every cell of the points grid filled, `value` per stage per player. */
function filled(points: Record<string, number[]>): StageGoalRaw {
  return Object.fromEntries(
    Object.entries(points).map(([id, perStage]) => [
      id,
      Object.fromEntries(perStage.map((n, i) => [stageKey(i + 1), String(n)])),
    ]),
  );
}

describe("stageKey", () => {
  it("names a stage's column after its rank", () => {
    expect(stageKey(3)).toBe("stage-3");
  });
});

describe("stageGoalSheet", () => {
  it("reads each stage by its number and the tile it scored", () => {
    const stages = stageCalendar(WINGSPAN, FULL_PICKS, CATALOGUE);
    const sheet = stageGoalSheet("Manche", stages, CATALOGUE);

    expect(sheet).toEqual([
      { key: "stage-1", label: "Manche 1 · Œufs dans Mer" },
      { key: "stage-2", label: "Manche 2 · Oiseaux au total" },
      { key: "stage-3", label: "Manche 3 · Oiseaux à faible coût" },
      { key: "stage-4", label: "Manche 4 · Œufs dans Forêt" },
    ]);
  });

  it("falls back on the stage's number while no tile is chosen", () => {
    const stages = stageCalendar(WINGSPAN, [], CATALOGUE);

    expect(stageGoalSheet("Manche", stages, CATALOGUE)[0]).toEqual({
      key: "stage-1",
      label: "Manche 1",
    });
  });

  it("reads a tile the catalogue no longer offers by its number alone", () => {
    const stages = stageCalendar(WINGSPAN, [pick("retired")], CATALOGUE);

    expect(stageGoalSheet("Manche", stages, CATALOGUE)[0]?.label).toBe(
      "Manche 1",
    );
  });
});

describe("mergeCells", () => {
  it("overwrites only the cells the manches own", () => {
    const merged = mergeCells(
      { a: { oiseaux: "5", objectifsManche: "2" }, b: { oiseaux: "3" } },
      { a: { objectifsManche: "9" }, b: { objectifsManche: "6" } },
    );

    expect(merged).toEqual({
      a: { oiseaux: "5", objectifsManche: "9" },
      b: { oiseaux: "3", objectifsManche: "6" },
    });
  });

  it("leaves the sheet untouched when there is nothing to carry over", () => {
    const sheet = { a: { oiseaux: "5" } };

    expect(mergeCells(sheet, {})).toEqual(sheet);
  });
});

describe("unscoredStageKeys", () => {
  const stages = stageCalendar(
    WINGSPAN,
    [pick("noGoal"), pick("totalBirds"), pick("cheapBirds"), pick("noGoal")],
    CATALOGUE,
  );

  it("names the manches laid with « pas d'objectif »", () => {
    expect(unscoredStageKeys(stages, CATALOGUE)).toEqual([
      "stage-1",
      "stage-4",
    ]);
  });

  it("names none when every tile scores", () => {
    const scoring = stageCalendar(WINGSPAN, FULL_PICKS, CATALOGUE);

    expect(unscoredStageKeys(scoring, CATALOGUE)).toEqual([]);
  });
});

describe("unscoredStageCells", () => {
  it("fills those manches in with a zero, for everybody at the table", () => {
    const stages = stageCalendar(
      WINGSPAN,
      [pick("totalBirds"), pick("noGoal"), pick("cheapBirds"), pick("noGoal")],
      CATALOGUE,
    );

    expect(unscoredStageCells(stages, CATALOGUE, [A, B])).toEqual({
      a: { "stage-2": "0", "stage-4": "0" },
      b: { "stage-2": "0", "stage-4": "0" },
    });
  });

  it("leaves an all-scoring calendar's cells to the table", () => {
    const stages = stageCalendar(WINGSPAN, FULL_PICKS, CATALOGUE);

    expect(unscoredStageCells(stages, CATALOGUE, [A])).toEqual({ a: {} });
  });
});

describe("finishedGoals", () => {
  it("records the calendar and every point once it is all there", () => {
    const goals = finishedGoals(
      WINGSPAN,
      FULL_PICKS,
      CATALOGUE,
      [A, B],
      filled({ a: [3, 1, 4, 2], b: [0, 5, 0, 6] }),
    );

    expect(goals.tilesReady).toBe(true);
    expect(goals.complete).toBe(true);
    expect(goals.remaining).toBe(0);
    expect(goals.scores).toHaveLength(8);
    expect(goals.scores).toContainEqual({ stage: 3, playerId: A, points: 4 });
    expect(goals.stages.map(s => s.goalKey)).toEqual([
      "eggsInHabitat",
      "totalBirds",
      "cheapBirds",
      "eggsInHabitat",
    ]);
  });

  it("reconstructs the laps a free tile hands out, as the funnel does", () => {
    const goals = finishedGoals(
      WINGSPAN,
      [pick("noGoal"), pick("totalBirds"), pick("cheapBirds"), pick("noGoal")],
      CATALOGUE,
      [A],
      filled({ a: [0, 2, 3, 0] }),
    );

    expect(goals.stages.map(s => s.turns)).toEqual([8, 8, 7, 6]);
  });

  it("keeps nothing while a tile is still missing", () => {
    const goals = finishedGoals(
      WINGSPAN,
      [pick("totalBirds")],
      CATALOGUE,
      [A],
      filled({ a: [1, 2, 3, 4] }),
    );

    expect(goals.tilesReady).toBe(false);
    expect(goals.complete).toBe(false);
    expect(goals.remaining).toBe(0);
    expect(goals.scores).toEqual([]);
  });

  it("keeps nothing while a tile's own parameter is unanswered", () => {
    const goals = finishedGoals(
      WINGSPAN,
      [
        pick("eggsInHabitat"),
        pick("totalBirds"),
        pick("cheapBirds"),
        pick("noGoal"),
      ],
      CATALOGUE,
      [A],
      filled({ a: [1, 2, 3, 4] }),
    );

    expect(goals.complete).toBe(false);
    expect(goals.scores).toEqual([]);
  });

  it("counts the cells still waiting for a number", () => {
    const goals = finishedGoals(WINGSPAN, FULL_PICKS, CATALOGUE, [A, B], {
      a: { "stage-1": "3", "stage-2": "", "stage-3": "not a number" },
    });

    // Three of A's four manches are unreadable, and B has typed nothing at all.
    expect(goals.tilesReady).toBe(true);
    expect(goals.remaining).toBe(7);
    expect(goals.complete).toBe(false);
    expect(goals.scores).toEqual([]);
  });

  it("records a manche nobody scored on as a real zero", () => {
    const goals = finishedGoals(
      WINGSPAN,
      FULL_PICKS,
      CATALOGUE,
      [A],
      filled({ a: [0, 0, 0, 0] }),
    );

    expect(goals.complete).toBe(true);
    expect(goals.scores.map(s => s.points)).toEqual([0, 0, 0, 0]);
  });

  it("scores a « pas d'objectif » manche at zero without being told", () => {
    const goals = finishedGoals(
      WINGSPAN,
      [pick("totalBirds"), pick("noGoal"), pick("cheapBirds"), pick("noGoal")],
      CATALOGUE,
      [A, B],
      {
        a: { "stage-1": "3", "stage-3": "4" },
        b: { "stage-1": "1", "stage-3": "2" },
      },
    );

    // Nothing was typed on manches 2 and 4, and nothing was waited for either.
    expect(goals.remaining).toBe(0);
    expect(goals.complete).toBe(true);
    expect(goals.scores).toContainEqual({ stage: 2, playerId: A, points: 0 });
    expect(goals.scores).toContainEqual({ stage: 4, playerId: B, points: 0 });
  });

  it("ignores whatever was typed on a manche that pays nobody", () => {
    const goals = finishedGoals(
      WINGSPAN,
      [pick("noGoal"), pick("totalBirds"), pick("cheapBirds"), pick("noGoal")],
      CATALOGUE,
      [A],
      filled({ a: [5, 2, 3, 5] }),
    );

    expect(goals.scores.map(s => s.points)).toEqual([0, 2, 3, 0]);
  });

  it("has nothing to record for a game played in no stages at all", () => {
    const goals = finishedGoals([], [], CATALOGUE, [A], {});

    expect(goals.stages).toEqual([]);
    expect(goals.tilesReady).toBe(false);
    expect(goals.complete).toBe(false);
    expect(goals.remaining).toBe(0);
  });
});
