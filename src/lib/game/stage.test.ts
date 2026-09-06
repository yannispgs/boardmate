import { describe, expect, it } from "vitest";

import type {
  GameStage,
  PlayerId,
  RoundGoal,
  ScoreSheetItem,
} from "@/lib/domain";

import {
  announcesStage,
  isCalendarReady,
  isGoalAvailable,
  isLastTurnOfStage,
  isParamValueAvailable,
  isStageEnd,
  otherPicks,
  pickAt,
  playCalendar,
  scheduledPosition,
  scheduledRoundLimit,
  stageCalendar,
  stageEndTurn,
  stageGoalLabel,
  stageGoalPrefill,
  stageGoalTotals,
  stagePosition,
  stageScores,
} from "./stage";

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

describe("stageCalendar", () => {
  it("keeps the base schedule when every tile scores", () => {
    const stages = stageCalendar(
      WINGSPAN,
      [
        pick("eggsInHabitat", { habitat: "sea" }),
        pick("totalBirds"),
        pick("cheapBirds"),
        pick("eggsInHabitat", { habitat: "forest" }),
      ],
      CATALOGUE,
    );

    expect(stages.map(s => s.turns)).toEqual([8, 7, 6, 5]);
    expect(stages.map(s => s.stage)).toEqual([1, 2, 3, 4]);
    expect(stages[0].goalParams).toEqual({ habitat: "sea" });
  });

  it("lengthens the stages after a « pas d'objectif », never its own", () => {
    const stages = stageCalendar(
      WINGSPAN,
      [
        pick("noGoal"),
        pick("totalBirds"),
        pick("cheapBirds"),
        pick("eggsInHabitat", { habitat: "sea" }),
      ],
      CATALOGUE,
    );

    expect(stages.map(s => s.turns)).toEqual([8, 8, 7, 6]);
  });

  it("accumulates two « pas d'objectif »", () => {
    const stages = stageCalendar(
      WINGSPAN,
      [pick("noGoal"), pick("noGoal"), pick("cheapBirds"), pick("totalBirds")],
      CATALOGUE,
    );

    expect(stages.map(s => s.turns)).toEqual([8, 8, 8, 7]);
  });

  it("changes nothing when the tile is laid out last", () => {
    const stages = stageCalendar(
      WINGSPAN,
      [
        pick("totalBirds"),
        pick("cheapBirds"),
        pick("eggsInHabitat"),
        pick("noGoal"),
      ],
      CATALOGUE,
    );

    expect(stages.map(s => s.turns)).toEqual(WINGSPAN);
  });

  it("previews a half-filled calendar, unknown tiles adding nothing", () => {
    const stages = stageCalendar(WINGSPAN, [pick("noGoal")], CATALOGUE);

    expect(stages.map(s => s.turns)).toEqual([8, 8, 7, 6]);
    expect(stages[1].goalKey).toBe("");
    expect(stages[1].goalParams).toEqual({});
  });

  it("ignores a tile the catalogue doesn't offer", () => {
    const stages = stageCalendar(WINGSPAN, [pick("nectarBonus")], CATALOGUE);

    expect(stages.map(s => s.turns)).toEqual(WINGSPAN);
  });

  it("returns nothing for a game without a schedule", () => {
    expect(stageCalendar([], [pick("noGoal")], CATALOGUE)).toEqual([]);
  });
});

describe("pickAt", () => {
  it("gives the tile chosen for that stage", () => {
    expect(pickAt([pick("totalBirds"), pick("cheapBirds")], 1)).toEqual(
      pick("cheapBirds"),
    );
  });

  it("gives an empty pick for a stage nobody has answered yet", () => {
    expect(pickAt([pick("totalBirds")], 2)).toEqual({
      goalKey: "",
      goalParams: {},
    });
  });
});

describe("otherPicks", () => {
  it("leaves out the stage being answered, keeping the tiles it must avoid", () => {
    const picks = [pick("totalBirds"), pick("cheapBirds"), pick("noGoal")];

    expect(otherPicks(picks, 1)).toEqual([pick("totalBirds"), pick("noGoal")]);
  });
});

describe("isCalendarReady", () => {
  const ready = stageCalendar(
    WINGSPAN,
    [
      pick("eggsInHabitat", { habitat: "sea" }),
      pick("totalBirds"),
      pick("cheapBirds"),
      pick("noGoal"),
    ],
    CATALOGUE,
  );

  it("accepts a calendar whose every tile is chosen and answered", () => {
    expect(isCalendarReady(ready, CATALOGUE)).toBe(true);
  });

  it("refuses a stage still without a tile", () => {
    const partial = stageCalendar(WINGSPAN, [pick("totalBirds")], CATALOGUE);

    expect(isCalendarReady(partial, CATALOGUE)).toBe(false);
  });

  it("refuses a tile whose parameter is unanswered", () => {
    const stages = stageCalendar(
      WINGSPAN,
      [
        pick("eggsInHabitat"),
        pick("totalBirds"),
        pick("cheapBirds"),
        pick("noGoal"),
      ],
      CATALOGUE,
    );

    expect(isCalendarReady(stages, CATALOGUE)).toBe(false);
  });

  it("refuses an empty calendar", () => {
    expect(isCalendarReady([], CATALOGUE)).toBe(false);
  });
});

describe("stageScores", () => {
  const stages = stageCalendar(
    WINGSPAN,
    [
      pick("totalBirds"),
      pick("noGoal"),
      pick("cheapBirds"),
      pick("eggsInHabitat", { habitat: "sea" }),
    ],
    CATALOGUE,
  );

  it("says a manche laid with « pas d'objectif » pays nobody", () => {
    expect(stageScores(stages[1], CATALOGUE)).toBe(false);
  });

  it("says every other tile scores", () => {
    expect(stageScores(stages[0], CATALOGUE)).toBe(true);
  });

  it("assumes a manche still without a tile will score", () => {
    const [first] = stageCalendar(WINGSPAN, [], CATALOGUE);

    expect(stageScores(first, CATALOGUE)).toBe(true);
  });

  it("says a game played on no calendar at all scores", () => {
    expect(stageScores(undefined, CATALOGUE)).toBe(true);
  });
});

describe("isParamValueAvailable", () => {
  it("offers a value no other stage aims at", () => {
    expect(isParamValueAvailable("habitat", "sea", [])).toBe(true);
    expect(isParamValueAvailable("habitat", "sea", [pick("totalBirds")])).toBe(
      true,
    );
  });

  it("withdraws a habitat another goal already targets, family or not", () => {
    const laid = [pick("birdsInHabitat", { habitat: "sea" })];

    expect(isParamValueAvailable("habitat", "sea", laid)).toBe(false);
    expect(isParamValueAvailable("habitat", "forest", laid)).toBe(true);
  });

  it("keeps the parameters apart — a nest never spends a habitat", () => {
    const laid = [pick("nestsWithEggs", { nest: "bowl" })];

    expect(isParamValueAvailable("habitat", "bowl", laid)).toBe(true);
  });
});

describe("isGoalAvailable", () => {
  const eggs = CATALOGUE[0];
  const birds = CATALOGUE[1];

  it("offers a tile nothing has taken", () => {
    expect(isGoalAvailable(birds, [])).toBe(true);
    expect(isGoalAvailable(birds, [pick("cheapBirds")])).toBe(true);
  });

  it("withdraws a one-off tile once it is laid", () => {
    expect(isGoalAvailable(birds, [pick("totalBirds")])).toBe(false);
  });

  it("keeps a family open while one of its values is still free", () => {
    const laid = [pick("eggsInHabitat", { habitat: "sea" })];

    expect(isGoalAvailable(eggs, laid)).toBe(true);
  });

  it("withdraws a family once every value it could aim at is spent", () => {
    const laid = [
      pick("eggsInHabitat", { habitat: "sea" }),
      pick("birdsInHabitat", { habitat: "forest" }),
    ];

    expect(isGoalAvailable(eggs, laid)).toBe(false);
  });

  it("spends nothing for a stage still choosing its value", () => {
    expect(isGoalAvailable(eggs, [pick("eggsInHabitat")])).toBe(true);
  });

  it("needs a free value on every one of its parameters", () => {
    const twoParams: RoundGoal = {
      key: "twoParams",
      label: "{a} et {b}",
      params: [
        {
          key: "a",
          label: "A",
          options: [
            { value: "a1", label: "A1" },
            { value: "a2", label: "A2" },
          ],
        },
        { key: "b", label: "B", options: [{ value: "b1", label: "B1" }] },
      ],
    };

    expect(isGoalAvailable(twoParams, [pick("other", { b: "b1" })])).toBe(
      false,
    );
    expect(isGoalAvailable(twoParams, [pick("other", { a: "a1" })])).toBe(true);
  });
});

describe("scheduledRoundLimit", () => {
  it("sums the laps of every stage", () => {
    const stages = stageCalendar(
      WINGSPAN,
      [pick("noGoal"), pick("totalBirds"), pick("cheapBirds"), pick("noGoal")],
      CATALOGUE,
    );

    expect(scheduledRoundLimit(stages)).toBe(29);
  });

  it("is zero without a calendar", () => {
    expect(scheduledRoundLimit([])).toBe(0);
  });
});

describe("stagePosition", () => {
  it("places a lap inside its stage, restarting the count each time", () => {
    expect(stagePosition(1, WINGSPAN)).toEqual({ stage: 1, round: 1 });
    expect(stagePosition(8, WINGSPAN)).toEqual({ stage: 1, round: 8 });
    expect(stagePosition(9, WINGSPAN)).toEqual({ stage: 2, round: 1 });
    expect(stagePosition(15, WINGSPAN)).toEqual({ stage: 2, round: 7 });
    expect(stagePosition(21, WINGSPAN)).toEqual({ stage: 3, round: 6 });
    expect(stagePosition(26, WINGSPAN)).toEqual({ stage: 4, round: 5 });
  });

  it("leaves the last stage open-ended", () => {
    expect(stagePosition(27, WINGSPAN)).toEqual({ stage: 4, round: 6 });
  });

  it("names stage 1 when the calendar is missing", () => {
    expect(stagePosition(3, [])).toEqual({ stage: 1, round: 3 });
  });

  it("refuses a lap that isn't a positive integer", () => {
    expect(() => stagePosition(0, WINGSPAN)).toThrow(/positive integer/);
    expect(() => stagePosition(1.5, WINGSPAN)).toThrow(/positive integer/);
  });
});

describe("isStageEnd", () => {
  it("is true on the last lap of a stage only", () => {
    expect(isStageEnd(7, WINGSPAN)).toBe(false);
    expect(isStageEnd(8, WINGSPAN)).toBe(true);
    expect(isStageEnd(9, WINGSPAN)).toBe(false);
    expect(isStageEnd(15, WINGSPAN)).toBe(true);
    expect(isStageEnd(26, WINGSPAN)).toBe(true);
  });

  it("follows a lengthened calendar", () => {
    const stages: GameStage[] = stageCalendar(
      WINGSPAN,
      [pick("noGoal"), pick("totalBirds"), pick("cheapBirds"), pick("noGoal")],
      CATALOGUE,
    );
    const turns = stages.map(s => s.turns);

    expect(turns).toEqual([8, 8, 7, 6]);
    expect(isStageEnd(15, turns)).toBe(false);
    expect(isStageEnd(16, turns)).toBe(true);
  });

  it("never ends a stage the calendar doesn't describe", () => {
    expect(isStageEnd(3, [])).toBe(false);
  });
});

describe("scheduledPosition", () => {
  it("walks the seats of a lap in order", () => {
    expect(scheduledPosition(1, 4, WINGSPAN)).toEqual({
      stage: 1,
      round: 1,
      seatIndex: 0,
    });
    expect(scheduledPosition(4, 4, WINGSPAN)).toEqual({
      stage: 1,
      round: 1,
      seatIndex: 3,
    });
    expect(scheduledPosition(5, 4, WINGSPAN)).toEqual({
      stage: 1,
      round: 2,
      seatIndex: 0,
    });
  });

  it("moves the first-player marker one seat along each stage", () => {
    // Stage 1 spans laps 1-8, so its 32nd turn is the last; stage 2 opens on
    // seat 1, stage 3 on seat 2.
    expect(scheduledPosition(33, 4, WINGSPAN)).toEqual({
      stage: 2,
      round: 1,
      seatIndex: 1,
    });
    expect(scheduledPosition(34, 4, WINGSPAN)).toEqual({
      stage: 2,
      round: 1,
      seatIndex: 2,
    });
    expect(scheduledPosition(36, 4, WINGSPAN)).toEqual({
      stage: 2,
      round: 1,
      seatIndex: 0,
    });
    expect(scheduledPosition(61, 4, WINGSPAN)).toEqual({
      stage: 3,
      round: 1,
      seatIndex: 2,
    });
  });

  it("wraps the marker back round the table", () => {
    expect(scheduledPosition(1, 2, WINGSPAN).seatIndex).toBe(0);
    // Stage 3 with two players: the marker has gone round once already.
    expect(scheduledPosition(31, 2, WINGSPAN)).toEqual({
      stage: 3,
      round: 1,
      seatIndex: 0,
    });
  });

  it("keeps everyone on the one seat of a simultaneous game", () => {
    expect(scheduledPosition(9, 1, WINGSPAN)).toEqual({
      stage: 2,
      round: 1,
      seatIndex: 0,
    });
  });

  it("refuses arguments that aren't positive integers", () => {
    expect(() => scheduledPosition(0, 4, WINGSPAN)).toThrow(/positive integer/);
    expect(() => scheduledPosition(1, 0, WINGSPAN)).toThrow(/positive integer/);
  });
});

describe("isLastTurnOfStage", () => {
  it("closes the stage on the last seat of its last lap", () => {
    // Stage 1 is 8 laps of 4 seats: turns 29-32 are its last lap.
    expect(isLastTurnOfStage(31, 4, WINGSPAN)).toBe(false);
    expect(isLastTurnOfStage(32, 4, WINGSPAN)).toBe(true);
    expect(isLastTurnOfStage(33, 4, WINGSPAN)).toBe(false);
  });

  it("is false on the last seat of any other lap", () => {
    expect(isLastTurnOfStage(28, 4, WINGSPAN)).toBe(false);
  });

  it("closes the last stage too, where the game ends", () => {
    // 26 laps in all, so turn 104 is the last of the game.
    expect(isLastTurnOfStage(104, 4, WINGSPAN)).toBe(true);
  });

  it("never closes a stage the calendar doesn't describe", () => {
    expect(isLastTurnOfStage(4, 4, [])).toBe(false);
  });
});

describe("stageEndTurn", () => {
  it("ends a stage on the last seat of its last lap", () => {
    // Stage 1 is 8 laps of 4 seats, so it runs to turn 32.
    expect(stageEndTurn(1, 4, WINGSPAN)).toEqual({ turn: 32, stage: 1 });
    expect(stageEndTurn(32, 4, WINGSPAN)).toEqual({ turn: 32, stage: 1 });
  });

  it("counts the stages before it in", () => {
    // Stage 2 adds its 7 laps to stage 1's 8: 15 laps, so turn 60.
    expect(stageEndTurn(33, 4, WINGSPAN)).toEqual({ turn: 60, stage: 2 });
  });

  it("ends the last stage where the game ends", () => {
    expect(stageEndTurn(104, 4, WINGSPAN)).toEqual({ turn: 104, stage: 4 });
  });

  it("never ends a stage before the turn being played", () => {
    // A turn past the calendar belongs to the last stage, which is open-ended.
    expect(stageEndTurn(120, 4, WINGSPAN)).toEqual({ turn: 120, stage: 4 });
  });
});

describe("stageGoalLabel", () => {
  const stage: GameStage = {
    stage: 1,
    goalKey: "eggsInHabitat",
    goalParams: { habitat: "sea" },
    turns: 8,
  };

  it("reads the tile out with its value filled in", () => {
    expect(stageGoalLabel(stage, CATALOGUE)).toBe("Œufs dans Mer");
  });

  it("reads a one-off tile as its own title", () => {
    expect(
      stageGoalLabel(
        { ...stage, goalKey: "noGoal", goalParams: {} },
        CATALOGUE,
      ),
    ).toBe("Pas d'objectif");
  });

  it("says nothing for a tile the catalogue no longer offers", () => {
    expect(stageGoalLabel({ ...stage, goalKey: "gone" }, CATALOGUE)).toBe("");
  });

  it("says nothing for a stage the calendar doesn't have", () => {
    expect(stageGoalLabel(undefined, CATALOGUE)).toBe("");
  });
});

describe("stageGoalTotals", () => {
  it("sums each player's goal points over the manches", () => {
    expect(
      stageGoalTotals([
        { stage: 1, playerId: A, points: 4 },
        { stage: 2, playerId: A, points: 3 },
        { stage: 1, playerId: B, points: 2 },
      ]),
    ).toEqual({ [A]: 7, [B]: 2 });
  });

  it("is empty before the first manche ends", () => {
    expect(stageGoalTotals([])).toEqual({});
  });
});

describe("stageGoalPrefill", () => {
  const SHEET: ScoreSheetItem[] = [
    {
      label: "Oiseaux",
      categories: [
        { key: "oiseaux", label: "Oiseaux" },
        {
          key: "objectifsManche",
          label: "Objectifs de manche",
          derived: "stageGoals",
        },
      ],
    },
    { key: "nectar", label: "Nectar" },
  ];

  it("fills the derived line for every player, as text", () => {
    const prefill = stageGoalPrefill(
      SHEET,
      [A, B],
      [
        { stage: 1, playerId: A, points: 4 },
        { stage: 2, playerId: A, points: 3 },
      ],
    );

    expect(prefill).toEqual({
      [A]: { objectifsManche: "7" },
      [B]: { objectifsManche: "0" },
    });
  });

  it("gives nothing when the sheet derives nothing", () => {
    expect(
      stageGoalPrefill([{ key: "nectar", label: "Nectar" }], [A], []),
    ).toEqual({});
  });
});

describe("playCalendar", () => {
  const calendar = stageCalendar(
    WINGSPAN,
    [pick("noGoal"), pick("totalBirds"), pick("cheapBirds"), pick("noGoal")],
    CATALOGUE,
  );

  it("lets the game's own calendar say how long it lasts", () => {
    expect(playCalendar("schedule", calendar, null)).toEqual({
      scheduled: true,
      turnsPerStage: [8, 8, 7, 6],
      roundLimit: 29,
    });
  });

  it("keeps the box's length for a game played in laps", () => {
    expect(playCalendar(undefined, [], 20)).toEqual({
      scheduled: false,
      turnsPerStage: [],
      roundLimit: 20,
    });
  });

  it("keeps the box's length for a game played in generations", () => {
    expect(playCalendar("pass", [], null).scheduled).toBe(false);
  });

  it("falls back on the box when the calendar never made it", () => {
    expect(playCalendar("schedule", [], null)).toEqual({
      scheduled: false,
      turnsPerStage: [],
      roundLimit: null,
    });
  });
});

describe("announcesStage", () => {
  // The rule is about who gets charged for the seconds after a stage turns
  // over, not only about a card: a game that announces holds its clock until
  // the table says it has seen the change.
  it("announces a stage the game turns over by itself", () => {
    expect(announcesStage({ label: "Génération", advance: "pass" })).toBe(true);

    expect(
      announcesStage({
        label: "Manche",
        advance: "schedule",
        schedule: [8, 7, 6, 5],
      }),
    ).toBe(true);
  });

  it("says nothing when the table closes the stage itself", () => {
    // Odin and Papayoo: somebody said it out loud, and a recap modal follows.
    expect(announcesStage({ label: "Manche", advance: "manual" })).toBe(false);
  });

  it("says nothing for a game with no stages at all", () => {
    expect(announcesStage(null)).toBe(false);
  });
});
