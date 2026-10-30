import { describe, expect, it } from "vitest";

import type { GameStatsRecord, PlayerId, StageScore } from "@/lib/domain";

import { ladderProgress, rungEffort } from "./ladder-stats";

const A = "a" as PlayerId;
const B = "b" as PlayerId;

function record(
  scores: StageScore[],
  fields: Partial<GameStatsRecord> = {},
): GameStatsRecord {
  return {
    players: [
      { playerId: A, name: "A" },
      { playerId: B, name: "B" },
    ],
    stageScores: scores,
    ...fields,
  } as GameStatsRecord;
}

describe("ladderProgress", () => {
  it("averages the climb manche by manche, each party for the manches it played", () => {
    const long = record([
      { stage: 1, playerId: A, points: 0, cleared: true },
      { stage: 1, playerId: B, points: 10, cleared: true },
      { stage: 2, playerId: A, points: 0, cleared: true },
      { stage: 2, playerId: B, points: 15 },
    ]);
    const short = record([
      { stage: 1, playerId: A, points: 0, cleared: true },
      { stage: 1, playerId: B, points: 20 },
    ]);

    expect(ladderProgress([long, short], 10)).toEqual([
      { stage: 1, average: 3 / 4, games: 2 },
      { stage: 2, average: 3 / 2, games: 1 },
    ]);
  });

  it("leaves out the variant, and a party with no manche", () => {
    const fixed = record(
      [{ stage: 1, playerId: A, points: 0, cleared: true }],
      { ladderFixed: true },
    );
    const empty = record([], { stageScores: undefined });

    expect(ladderProgress([fixed, empty], 10)).toEqual([]);
  });
});

describe("rungEffort", () => {
  // A clears rung 1 in manche 1 and rung 2 in manche 3 (manche 2 failed); B
  // clears rung 1 in manche 2. Laps: 4, 6, 3.
  const scores: StageScore[] = [
    { stage: 1, playerId: A, points: 0, cleared: true },
    { stage: 1, playerId: B, points: 20 },
    { stage: 2, playerId: A, points: 15 },
    { stage: 2, playerId: B, points: 0, cleared: true },
    { stage: 3, playerId: A, points: 0, cleared: true },
    { stage: 3, playerId: B, points: 10 },
  ];
  const laps = [
    { stage: 1, phaseKey: "manche", durationS: 60, laps: 4 },
    { stage: 2, phaseKey: "manche", durationS: 60, laps: 6 },
    { stage: 3, phaseKey: "manche", durationS: 60, laps: 3 },
  ];

  it("charges a rung every manche spent on it, failed ones included", () => {
    expect(rungEffort([record(scores, { phaseTimes: laps })], 3)).toEqual([
      // A: 1 manche, 4 laps; B: 2 manches, 10 laps.
      { rung: 1, manches: 1.5, laps: 7, cleared: 2 },
      // A: manches 2 and 3, 9 laps. B never cleared it: left out.
      { rung: 2, manches: 2, laps: 9, cleared: 1 },
    ]);
  });

  it("keeps the manches but not the laps where nobody counted them", () => {
    expect(rungEffort([record(scores)], 3)).toEqual([
      { rung: 1, manches: 1.5, laps: null, cleared: 2 },
      { rung: 2, manches: 2, laps: null, cleared: 1 },
    ]);
  });

  it("stops at the top rung, and leaves the variant out", () => {
    const fixed = record(scores, { ladderFixed: true });

    expect(rungEffort([record(scores, { phaseTimes: laps })], 1)).toEqual([
      { rung: 1, manches: 1.5, laps: 7, cleared: 2 },
    ]);
    expect(
      rungEffort([fixed, record([], { stageScores: undefined })], 3),
    ).toEqual([]);
  });
});
