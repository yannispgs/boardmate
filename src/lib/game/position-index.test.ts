import { describe, expect, it } from "vitest";

import type {
  Boardgame,
  BoardgameId,
  GameStatsRecord,
  PlayerId,
} from "@/lib/domain";
import {
  orderPlayers,
  playerPositionsByGame,
  positionIndexes,
} from "./position-index";

type P = { id: string; score: number | null; winner?: boolean };

/** A minimal stats record carrying only what the position index reads. */
function rec(players: P[], boardgameId = "b"): GameStatsRecord {
  return {
    gameId: "g" as never,
    boardgameId: boardgameId as BoardgameId,
    boardgameName: "Catan",
    dice: null,
    endedAt: "2026-01-01T00:00:00Z",
    players: players.map((p, i) => ({
      playerId: p.id as PlayerId,
      name: p.id,
      seatOrder: i,
      isWinner: p.winner ?? false,
      score: p.score,
    })),
    turns: [],
    diceRolls: [],
  };
}

const id = (value: string) => value as PlayerId;

describe("positionIndexes", () => {
  it("places the winner at 0 and the last at 100, whatever the table size", () => {
    const indexes = positionIndexes(
      [
        rec([
          { id: "a", score: 10, winner: true },
          { id: "b", score: 7 },
          { id: "c", score: 3 },
        ]),
      ],
      "highest",
    );

    expect(indexes.get(id("a"))?.index).toBe(0);
    expect(indexes.get(id("b"))?.index).toBe(50);
    expect(indexes.get(id("c"))?.index).toBe(100);
  });

  it("averages one weight per party", () => {
    const indexes = positionIndexes(
      [
        rec([
          { id: "a", score: 10, winner: true },
          { id: "b", score: 3 },
        ]),
        rec([
          { id: "b", score: 9, winner: true },
          { id: "a", score: 5 },
          { id: "c", score: 1 },
          { id: "d", score: 0 },
          { id: "e", score: 0 },
        ]),
      ],
      "highest",
    );

    // a: 0 then 25 → 12.5 ; b: 100 then 0 → 50 — each on two parties.
    expect(indexes.get(id("a"))).toEqual({ index: 12.5, parties: 2 });
    expect(indexes.get(id("b"))).toEqual({ index: 50, parties: 2 });
  });

  it("reads the smallest total as the best on a game won low", () => {
    const indexes = positionIndexes(
      [
        rec([
          { id: "a", score: 2, winner: true },
          { id: "b", score: 9 },
        ]),
      ],
      "lowest",
    );

    expect(indexes.get(id("a"))?.index).toBe(0);
    expect(indexes.get(id("b"))?.index).toBe(100);
  });

  it("lets the crown settle a tie on points", () => {
    const indexes = positionIndexes(
      [
        rec([
          { id: "a", score: 8 },
          { id: "b", score: 8, winner: true },
        ]),
      ],
      "highest",
    );

    expect(indexes.get(id("b"))?.index).toBe(0);
    expect(indexes.get(id("a"))?.index).toBe(100);
  });

  it("leaves out a party with a missing score", () => {
    const indexes = positionIndexes(
      [
        rec([
          { id: "a", score: 8, winner: true },
          { id: "b", score: null },
        ]),
      ],
      "highest",
    );

    expect(indexes.size).toBe(0);
  });

  it("leaves out a party that separates nobody", () => {
    const indexes = positionIndexes(
      [
        rec([
          { id: "a", score: 5, winner: true },
          { id: "b", score: 5, winner: true },
        ]),
        rec([{ id: "c", score: 4, winner: true }]),
      ],
      "highest",
    );

    expect(indexes.size).toBe(0);
  });
});

describe("orderPlayers", () => {
  const players = [
    { playerId: id("a"), name: "Alice", games: 10, winRate: 40 },
    { playerId: id("b"), name: "Bob", games: 1, winRate: 100 },
    { playerId: id("c"), name: "Chloé", games: 4, winRate: 100 },
    { playerId: id("d"), name: "David", games: 3, winRate: 0 },
  ];
  const indexes = new Map([
    [id("a"), { index: 20, parties: 5 }],
    [id("b"), { index: 0, parties: 1 }],
    [id("c"), { index: 20, parties: 3 }],
  ]);
  const names = (list: typeof players) => list.map(p => p.name);

  it("puts the best win rate first, then the most parties", () => {
    expect(names(orderPlayers(players, "winRate", indexes))).toEqual([
      "Chloé",
      "Bob",
      "Alice",
      "David",
    ]);
  });

  it("puts the best position first, the win rate settling a tie, and the unplaced last", () => {
    expect(names(orderPlayers(players, "position", indexes))).toEqual([
      "Bob",
      "Chloé",
      "Alice",
      "David",
    ]);
  });

  it("falls back to the name when everything else is level", () => {
    const level = [
      { playerId: id("y"), name: "Yann", games: 2, winRate: 50 },
      { playerId: id("x"), name: "Xavier", games: 2, winRate: 50 },
    ];

    expect(names(orderPlayers(level, "position", new Map()))).toEqual([
      "Xavier",
      "Yann",
    ]);
  });
});

describe("playerPositionsByGame", () => {
  /** A boardgame carrying only what the per-game reading looks at. */
  function game(
    gameId: string,
    winCondition: "highest" | "lowest" | null,
  ): Boardgame {
    return {
      id: gameId as BoardgameId,
      scoring:
        winCondition === null
          ? null
          : {
              timing: "final",
              entry: "total",
              winCondition: { type: winCondition },
            },
    } as Boardgame;
  }

  /** `times` parties of a game where `a` finishes first, `b` second. */
  function parties(gameId: string, times: number, low = false) {
    return Array.from({ length: times }, () =>
      rec(
        [
          { id: "a", score: low ? 1 : 9, winner: true },
          { id: "b", score: 5 },
        ],
        gameId,
      ),
    );
  }

  it("reads each game in its own direction, from the third ranked party", () => {
    const positions = playerPositionsByGame(
      [...parties("high", 3), ...parties("low", 3, true), ...parties("few", 2)],
      [game("high", "highest"), game("low", "lowest"), game("few", "highest")],
      id("b"),
    );

    expect(positions.get("high" as BoardgameId)).toBe(100);
    expect(positions.get("low" as BoardgameId)).toBe(100);
    expect(positions.has("few" as BoardgameId)).toBe(false);
  });

  it("skips a game that keeps no score", () => {
    const positions = playerPositionsByGame(
      parties("free", 3),
      [game("free", null)],
      id("a"),
    );

    expect(positions.size).toBe(0);
  });
});
