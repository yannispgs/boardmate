import { describe, expect, it } from "vitest";
import type {
  BoardgameId,
  GameStatsRecord,
  PhaseSpec,
  PhaseTime,
  PlayerId,
} from "@/lib/domain";
import {
  phaseTotals,
  stageBreakdowns,
  turnPhase,
  turnPhaseStats,
} from "./phase-stats";

const PHASES: PhaseSpec[] = [
  {
    key: "discovery",
    label: "Découverte",
    mode: "simultaneous",
    clock: "stopwatch",
  },
  {
    key: "projects",
    label: "Projets",
    mode: "sequential",
    clock: "turnTimer",
  },
  {
    key: "production",
    label: "Production",
    mode: "simultaneous",
    clock: "stopwatch",
  },
];

/** Two generations, the second one heavier than the first. */
const TIMES: PhaseTime[] = [
  { stage: 1, phaseKey: "production", durationS: 20 },
  { stage: 1, phaseKey: "discovery", durationS: 60 },
  { stage: 1, phaseKey: "projects", durationS: 120 },
  { stage: 2, phaseKey: "discovery", durationS: 100 },
  { stage: 2, phaseKey: "projects", durationS: 200 },
];

describe("stageBreakdowns", () => {
  it("lays a stage out in the boardgame's phase order, oldest stage first", () => {
    const [first, second] = stageBreakdowns(TIMES, PHASES);

    expect(first?.stage).toBe(1);
    expect(first?.totalS).toBe(200);
    expect(first?.slices.map(s => s.key)).toEqual([
      "discovery",
      "projects",
      "production",
    ]);

    expect(second?.stage).toBe(2);
    expect(second?.slices.map(s => s.key)).toEqual(["discovery", "projects"]);
  });

  it("gives each phase its share of its own stage", () => {
    const [first] = stageBreakdowns(TIMES, PHASES);

    expect(first?.slices.map(s => s.share)).toEqual([0.3, 0.6, 0.1]);
  });

  it("has nothing to show for a game that declares no phase", () => {
    expect(stageBreakdowns(TIMES, null)).toEqual([]);
    expect(stageBreakdowns(TIMES, [])).toEqual([]);
  });

  it("leaves out a stage nothing was ever recorded for", () => {
    const times = [{ stage: 3, phaseKey: "gone", durationS: 30 }];

    expect(stageBreakdowns(times, PHASES)).toEqual([]);
  });

  it("gives no share at all to a stage that took no time", () => {
    const times = [{ stage: 1, phaseKey: "discovery", durationS: 0 }];
    const [only] = stageBreakdowns(times, PHASES);

    expect(only?.totalS).toBe(0);
    expect(only?.slices[0]?.share).toBe(0);
  });
});

describe("phaseTotals", () => {
  it("totals each phase over the party, in play order", () => {
    const totals = phaseTotals(TIMES, PHASES);

    expect(totals.map(t => t.key)).toEqual([
      "discovery",
      "projects",
      "production",
    ]);
    expect(totals.map(t => t.totalS)).toEqual([160, 320, 20]);
  });

  it("averages a phase over the stages that recorded it, not every stage", () => {
    const production = phaseTotals(TIMES, PHASES).find(
      t => t.key === "production",
    );

    expect(production?.stages).toBe(1);
    expect(production?.averageS).toBe(20);
  });

  it("shares out the whole time spent in phases", () => {
    const totals = phaseTotals(TIMES, PHASES);
    const sum = totals.reduce((acc, t) => acc + t.share, 0);

    expect(sum).toBeCloseTo(1);
    expect(totals[0]?.share).toBeCloseTo(160 / 500);
  });

  it("reads the same rows over several parties", () => {
    const totals = phaseTotals(TIMES, PHASES, 4);

    expect(totals[0]?.perGameS).toBe(40);
  });

  it("has nothing to show for a game that declares no phase", () => {
    expect(phaseTotals(TIMES, null)).toEqual([]);
    expect(phaseTotals(TIMES, [])).toEqual([]);
  });

  it("gives no share when every phase was instantaneous", () => {
    const times = [{ stage: 1, phaseKey: "discovery", durationS: 0 }];

    expect(phaseTotals(times, PHASES)[0]?.share).toBe(0);
  });
});

describe("turnPhase", () => {
  it("finds the one phase turns are taken in", () => {
    expect(turnPhase(PHASES)?.key).toBe("projects");
  });

  it("finds none on a game with no phases, or none that runs the timer", () => {
    expect(turnPhase(null)).toBeNull();
    expect(turnPhase(PHASES.filter(p => p.clock === "stopwatch"))).toBeNull();
  });
});

const MARS = "bg-mars" as BoardgameId;
const CATAN = "bg-catan" as BoardgameId;
const ANNA = "p-anna" as PlayerId;
const BEN = "p-ben" as PlayerId;

/** A finished party reduced to the turn log, which is all these stats read. */
function record(
  boardgameId: BoardgameId,
  turns: Array<{ playerId: PlayerId; durationS: number }>,
): GameStatsRecord {
  return {
    gameId: `g-${boardgameId}-${turns.length}` as GameStatsRecord["gameId"],
    boardgameId,
    boardgameName: "—",
    dice: null,
    endedAt: null,
    players: [],
    turns: turns.map(t => ({
      playerId: t.playerId,
      round: 1,
      durationS: t.durationS,
      pauseDurationS: 0,
      overtimeS: 0,
    })),
    diceRolls: [],
  };
}

const BOARDGAMES = [
  { id: MARS, name: "Terraforming Mars", phases: PHASES },
  { id: CATAN, name: "Catan", phases: null },
];

describe("turnPhaseStats", () => {
  const records = [
    record(MARS, [
      { playerId: ANNA, durationS: 60 },
      { playerId: BEN, durationS: 20 },
    ]),
    record(MARS, [
      { playerId: ANNA, durationS: 40 },
      { playerId: BEN, durationS: 40 },
    ]),
    record(CATAN, [{ playerId: ANNA, durationS: 300 }]),
  ];

  it("reads a player against the table in the turn-taking phase", () => {
    const [stat] = turnPhaseStats(records, BOARDGAMES, ANNA);

    expect(stat?.boardgameName).toBe("Terraforming Mars");
    expect(stat?.label).toBe("Projets");
    expect(stat?.averageS).toBe(50);
    expect(stat?.tableAverageS).toBe(40);
  });

  it("counts the parties and turns it averaged", () => {
    const [stat] = turnPhaseStats(records, BOARDGAMES, ANNA);

    expect(stat?.games).toBe(2);
    expect(stat?.turns).toBe(2);
  });

  it("says nothing about a game that declares no phase", () => {
    expect(turnPhaseStats(records, BOARDGAMES, ANNA)).toHaveLength(1);
  });

  it("says nothing about a player who never took a turn on it", () => {
    const stranger = "p-zoe" as PlayerId;

    expect(turnPhaseStats(records, BOARDGAMES, stranger)).toEqual([]);
  });
});
