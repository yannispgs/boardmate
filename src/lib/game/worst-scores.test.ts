import { describe, expect, it } from "vitest";

import type { GameStatsRecord, PlayerId } from "@/lib/domain";

import { worstScoresByPlayerCount } from "./worst-scores";

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

describe("worstScoresByPlayerCount", () => {
  it("files each score under the size of the table, small tables first", () => {
    const groups = worstScoresByPlayerCount(
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
      worstScoresByPlayerCount(parties, "highest")[0].scores.map(s => s.score),
    ).toEqual([12, 40]);
  });

  it("keeps a podium of three per table size", () => {
    const groups = worstScoresByPlayerCount(
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
    );

    expect(groups[0].scores.map(s => s.score)).toEqual([40, 30, 20]);
  });

  it("keeps as many as asked for when asked", () => {
    const groups = worstScoresByPlayerCount(
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
    const groups = worstScoresByPlayerCount(
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
      worstScoresByPlayerCount(
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
    const groups = worstScoresByPlayerCount(
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
