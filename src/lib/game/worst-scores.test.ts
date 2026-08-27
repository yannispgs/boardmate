import { describe, expect, it } from "vitest";

import type { GameStatsRecord, PlayerId } from "@/lib/domain";

import { tracksWorstScores, worstScoreSlices } from "./worst-scores";

const A = "a" as PlayerId;
const B = "b" as PlayerId;
const C = "c" as PlayerId;

const NAMES: Record<string, string> = { a: "Alice", b: "Bob", c: "Chloé" };

/** One party, given as the final score of each player who sat at the table. */
function record(
  scores: Array<[PlayerId, number | null]>,
  endedAt: string | null = "2026-08-16T20:00:00.000Z",
): GameStatsRecord {
  return {
    gameId: "g" as GameStatsRecord["gameId"],
    boardgameId: "b" as GameStatsRecord["boardgameId"],
    boardgameName: "Papayoo",
    dice: null,
    endedAt,
    players: scores.map(([playerId, score], i) => ({
      playerId,
      name: NAMES[playerId],
      seatOrder: i,
      isWinner: false,
      score,
    })),
    turns: [],
    diceRolls: [],
    stageScores: [],
  };
}

describe("tracksWorstScores", () => {
  it("gives a section to a game won by scoring little", () => {
    expect(
      tracksWorstScores({ scoring: { winCondition: { type: "lowest" } } }),
    ).toBe(true);
  });

  it("keeps it from a game won by scoring a lot", () => {
    expect(
      tracksWorstScores({ scoring: { winCondition: { type: "highest" } } }),
    ).toBe(false);
  });

  it("keeps it from a game that is not scored at all", () => {
    expect(tracksWorstScores({ scoring: null })).toBe(false);
  });
});

describe("worstScoreSlices", () => {
  it("files each score under the size of the table, small tables first", () => {
    const groups = worstScoreSlices(
      [
        record([
          [A, 120],
          [B, 130],
          [C, 250],
        ]),
        record([
          [A, 90],
          [B, 160],
        ]),
      ],
      "lowest",
      { byPlayerCount: true },
    );

    expect(groups.map(g => g.playerCount)).toEqual([2, 3]);
    expect(groups[0].scores.map(s => s.score)).toEqual([160, 90]);
    expect(groups[1].scores[0]).toEqual({
      playerId: C,
      name: "Chloé",
      score: 250,
      endedAt: "2026-08-16T20:00:00.000Z",
    });
  });

  it("reads the wrong end of the range off the game's own direction", () => {
    const parties = [
      record([
        [A, 12],
        [B, 40],
      ]),
    ];

    expect(
      worstScoreSlices(parties, "highest")[0].scores.map(s => s.score),
    ).toEqual([12, 40]);
  });

  it("keeps a podium of three per table size", () => {
    const groups = worstScoreSlices(
      [
        record([
          [A, 10],
          [B, 20],
        ]),
        record([
          [A, 30],
          [B, 40],
        ]),
      ],
      "lowest",
      { byPlayerCount: true },
    );

    expect(groups[0].scores.map(s => s.score)).toEqual([40, 30, 20]);
  });

  it("reads every table as one when the seat count has no bearing", () => {
    const slices = worstScoreSlices(
      [
        record([
          [A, 120],
          [B, 130],
          [C, 250],
        ]),
        record([
          [A, 90],
          [B, 160],
        ]),
      ],
      "lowest",
    );

    expect(slices).toHaveLength(1);
    expect(slices[0].playerCount).toBeNull();
    expect(slices[0].scores.map(s => s.score)).toEqual([250, 160, 130]);
  });

  it("keeps as many as asked for when asked", () => {
    const groups = worstScoreSlices(
      [
        record([
          [A, 10],
          [B, 20],
        ]),
      ],
      "lowest",
      { limit: 1 },
    );

    expect(groups[0].scores.map(s => s.score)).toEqual([20]);
  });

  it("narrows the ranking to one player when given one", () => {
    const groups = worstScoreSlices(
      [
        record([
          [A, 120],
          [B, 130],
        ]),
        record([
          [A, 200],
          [B, 50],
        ]),
      ],
      "lowest",
      { playerId: A },
    );

    expect(groups[0].scores.map(s => s.score)).toEqual([200, 120]);
  });

  it("leaves out a table size where nothing was ever scored", () => {
    expect(
      worstScoreSlices(
        [
          record([
            [A, null],
            [B, null],
          ]),
        ],
        "lowest",
      ),
    ).toEqual([]);
  });

  it("keeps a score whose party never recorded when it ended", () => {
    const groups = worstScoreSlices(
      [
        record(
          [
            [A, 10],
            [B, 20],
          ],
          null,
        ),
      ],
      "lowest",
    );

    expect(groups[0].scores[0].endedAt).toBeNull();
  });
});
