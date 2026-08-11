import { describe, expect, it } from "vitest";

import type { PlayerId } from "@/lib/domain";

import {
  type GenerationRibbon,
  generationSequence,
  lapSequence,
  stageSequence,
} from "./turn-ribbon";

const A = "a" as PlayerId;
const B = "b" as PlayerId;
const C = "c" as PlayerId;
const SEATS = [A, B, C];

/** The ribbon read back the way it reads on screen: « turn player lap ». */
function readable(
  turns: Array<{ turn: number; playerId: PlayerId; lap: number }>,
): string[] {
  return turns.map(t => `${t.turn} ${t.playerId} L${t.lap}`);
}

describe("lapSequence", () => {
  it("gives nothing for an empty table", () => {
    expect(lapSequence([], 0, 5, null)).toEqual([]);
  });

  it("repeats the seating, one lap after another", () => {
    const seq = lapSequence(SEATS, 1, 3, null);

    expect(readable(seq)).toEqual([
      "0 a L1",
      "1 b L1",
      "2 c L1",
      "3 a L2",
      "4 b L2",
    ]);
  });

  it("opens a lap on the first seat and closes it on the last", () => {
    const seq = lapSequence(SEATS, 0, 3, null);

    expect(seq.map(t => t.firstOfLap)).toEqual([true, false, false, true]);
    expect(seq.map(t => t.lastOfLap)).toEqual([false, false, true, false]);
  });

  it("stops a fixed-length game on its final turn", () => {
    const seq = lapSequence(SEATS, 3, 9, 5);

    expect(readable(seq)).toEqual([
      "0 a L1",
      "1 b L1",
      "2 c L1",
      "3 a L2",
      "4 b L2",
      "5 c L2",
    ]);
  });

  it("keeps announcing turns while the end is out of reach", () => {
    expect(lapSequence(SEATS, 0, 2, 99).at(-1)?.turn).toBe(2);
  });
});

describe("stageSequence", () => {
  // Two laps in the first manche, one in the second.
  const CALENDAR = [2, 1];

  it("gives nothing for an empty table", () => {
    expect(stageSequence([], 0, 5, null, CALENDAR)).toEqual([]);
  });

  it("counts the laps within each manche, and hands the marker on", () => {
    const seq = stageSequence(SEATS, 0, 8, null, CALENDAR);

    expect(readable(seq)).toEqual([
      "0 a L1",
      "1 b L1",
      "2 c L1",
      "3 a L2",
      "4 b L2",
      "5 c L2",
      // Manche 2: the marker moved one seat along, and the lap count restarts.
      "6 b L1",
      "7 c L1",
      "8 a L1",
    ]);
  });

  it("opens and closes each lap wherever the marker sits", () => {
    const seq = stageSequence(SEATS, 0, 8, null, CALENDAR);

    expect(seq.filter(t => t.firstOfLap).map(t => t.turn)).toEqual([0, 3, 6]);
    expect(seq.filter(t => t.lastOfLap).map(t => t.turn)).toEqual([2, 5]);
  });

  it("stops on the calendar's last turn", () => {
    const seq = stageSequence(SEATS, 0, 20, 5, CALENDAR);

    expect(seq.at(-1)?.turn).toBe(5);
  });
});

describe("generationSequence", () => {
  function input(patch: Partial<GenerationRibbon> = {}): GenerationRibbon {
    return {
      seats: SEATS,
      played: [],
      current: 0,
      currentPlayerId: A,
      stage: 1,
      passes: [],
      ahead: 3,
      ...patch,
    };
  }

  it("gives nothing for an empty table", () => {
    expect(generationSequence(input({ seats: [] }))).toEqual([]);
  });

  it("turns around the table while nobody has passed", () => {
    const seq = generationSequence(input());

    expect(readable(seq)).toEqual(["0 a L1", "1 b L1", "2 c L1", "3 a L2"]);
  });

  it("skips whoever has passed this generation", () => {
    const seq = generationSequence(
      input({
        played: [{ turn: 0, playerId: A, stage: 1 }],
        current: 1,
        currentPlayerId: B,
        passes: [{ playerId: C, stage: 1 }],
      }),
    );

    expect(readable(seq)).toEqual([
      "0 a L1",
      "1 b L1",
      "2 a L2",
      "3 b L2",
      "4 a L3",
    ]);
  });

  it("ignores a pass filed under another generation", () => {
    const seq = generationSequence(
      input({ passes: [{ playerId: B, stage: 2 }], ahead: 2 }),
    );

    expect(readable(seq)).toEqual(["0 a L1", "1 b L1", "2 c L1"]);
  });

  it("keeps handing the turn back to the only player left in", () => {
    const seq = generationSequence(
      input({
        current: 4,
        currentPlayerId: C,
        passes: [
          { playerId: A, stage: 1 },
          { playerId: B, stage: 1 },
        ],
        ahead: 2,
      }),
    );

    expect(readable(seq)).toEqual(["4 c L1", "5 c L2", "6 c L3"]);
  });

  it("restarts the laps on the generation's own first player", () => {
    // Generation 2 opens on seat 1 (the marker moved one along), so its first
    // lap is b, c, a — and the numbering starts over at Tour 1.
    const seq = generationSequence(
      input({
        played: [
          { turn: 0, playerId: A, stage: 1 },
          { turn: 1, playerId: B, stage: 1 },
          { turn: 2, playerId: C, stage: 1 },
        ],
        current: 3,
        currentPlayerId: B,
        stage: 2,
        passes: [
          { playerId: A, stage: 1 },
          { playerId: B, stage: 1 },
          { playerId: C, stage: 1 },
        ],
        ahead: 3,
      }),
    );

    expect(readable(seq)).toEqual([
      "0 a L1",
      "1 b L1",
      "2 c L1",
      "3 b L1",
      "4 c L1",
      "5 a L1",
      "6 b L2",
    ]);
    expect(seq.map(t => t.firstOfLap)).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
    expect(seq.map(t => t.lastOfLap)).toEqual([
      false,
      false,
      true,
      false,
      false,
      true,
      false,
    ]);
  });

  it("reads the past from the log, whatever order it comes in", () => {
    const seq = generationSequence(
      input({
        played: [
          { turn: 1, playerId: B, stage: 1 },
          { turn: 0, playerId: A, stage: 1 },
        ],
        current: 2,
        currentPlayerId: C,
        ahead: 1,
      }),
    );

    expect(readable(seq)).toEqual(["0 a L1", "1 b L1", "2 c L1", "3 a L2"]);
  });

  it("leaves out an ownerless turn and anything not yet played", () => {
    const seq = generationSequence(
      input({
        played: [
          { turn: 0, playerId: null, stage: 1 },
          { turn: 5, playerId: C, stage: 1 },
        ],
        current: 1,
        currentPlayerId: B,
        ahead: 1,
      }),
    );

    expect(readable(seq)).toEqual(["1 b L1", "2 c L1"]);
  });
});
