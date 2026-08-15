import { describe, expect, it } from "vitest";

import type { BoardgameId, GameStatsRecord, PlayerId } from "@/lib/domain";
import {
  boardgameOptions,
  computeGlobalStats,
  coPlayerOptions,
} from "./global-stats";

const CATAN = "bg-catan" as BoardgameId;
const WINGSPAN = "bg-wingspan" as BoardgameId;
const ALICE = "p-alice" as PlayerId;
const BOB = "p-bob" as PlayerId;
const CHLOE = "p-chloe" as PlayerId;

function turn(
  playerId: PlayerId,
  round: number,
  durationS: number,
  overtimeS = 0,
  pauseDurationS = 0,
): GameStatsRecord["turns"][number] {
  return { playerId, round, durationS, overtimeS, pauseDurationS };
}

// Game 1 (Catan): Alice beats Bob. Two rounds; Alice slower overall.
const game1: GameStatsRecord = {
  gameId: "g1" as GameStatsRecord["gameId"],
  boardgameId: CATAN,
  boardgameName: "Catan",
  dice: null,
  endedAt: "2026-07-01T10:00:00Z",
  players: [
    { playerId: ALICE, name: "Alice", seatOrder: 0, isWinner: true, score: 10 },
    { playerId: BOB, name: "Bob", seatOrder: 0, isWinner: false, score: 8 },
  ],
  turns: [
    turn(ALICE, 1, 60, 5, 0),
    turn(BOB, 1, 40, 0, 10),
    turn(ALICE, 2, 40),
    turn(BOB, 2, 20),
  ],
  diceRolls: [],
};

// Game 2 (Wingspan): Bob beats Alice and Chloé. Alice unscored here.
const game2: GameStatsRecord = {
  gameId: "g2" as GameStatsRecord["gameId"],
  boardgameId: WINGSPAN,
  boardgameName: "Wingspan",
  dice: null,
  endedAt: "2026-07-02T10:00:00Z",
  players: [
    {
      playerId: ALICE,
      name: "Alice",
      seatOrder: 0,
      isWinner: false,
      score: null,
    },
    { playerId: BOB, name: "Bob", seatOrder: 0, isWinner: true, score: 90 },
    {
      playerId: CHLOE,
      name: "Chloé",
      seatOrder: 0,
      isWinner: false,
      score: 70,
    },
  ],
  turns: [turn(ALICE, 1, 30), turn(BOB, 1, 30), turn(CHLOE, 1, 60)],
  diceRolls: [],
};

describe("computeGlobalStats", () => {
  it("averages overall figures across all games by default", () => {
    const s = computeGlobalStats([game1, game2]);

    expect(s.gameCount).toBe(2);
    // Active totals: game1 = 160, game2 = 120 → 280 total, 140 mean.
    expect(s.totalActiveS).toBe(280);
    expect(s.avgActiveS).toBe(140);
    // Rounds: game1 = 2, game2 = 1 → mean 1.5.
    expect(s.avgRounds).toBe(1.5);
    // Turns: 4 + 3 = 7; 280 / 7 = 40.
    expect(s.avgTurnS).toBeCloseTo(40);
    // Scored participations: 10, 8 (game1), 90, 70 (game2) → 178 / 4 = 44.5.
    expect(s.avgScore).toBe(44.5);
  });

  it("builds a per-player leaderboard sorted by win rate", () => {
    const s = computeGlobalStats([game1, game2]);
    const [first, second] = s.players;

    // Bob: 1 win / 1 game in game2 but he's in both → 1 win / 2 games = 50%.
    // Alice: 1 win / 2 games = 50%. Chloé: 0 / 1. Bob & Alice tie on rate;
    // both have 2 games → tie broken by wins (1 each) → name (Alice first).
    expect(s.players.map(p => p.name)).toEqual(["Alice", "Bob", "Chloé"]);

    expect(first.name).toBe("Alice");
    expect(first.games).toBe(2);
    expect(first.wins).toBe(1);
    expect(first.winRate).toBe(50);
    // Alice scored only in game1 (10); unscored in game2.
    expect(first.scoredGames).toBe(1);
    expect(first.avgScore).toBe(10);
    // Alice active: game1 100s over 2 turns, game2 30s over 1 turn → 130/3.
    expect(first.avgTurnS).toBeCloseTo(130 / 3);
    // Overtime: 5 (game1) + 0 → mean 2.5 over 2 games.
    expect(first.avgOvertimeS).toBe(2.5);

    expect(second.name).toBe("Bob");
    expect(second.avgScore).toBe((8 + 90) / 2);
    // Bob paused 10s in game1 only → mean 5 over 2 games.
    expect(second.avgPauseS).toBe(5);
  });

  it("filters by boardgame", () => {
    const s = computeGlobalStats([game1, game2], { boardgameIds: [WINGSPAN] });

    expect(s.gameCount).toBe(1);
    expect(s.players.map(p => p.name).sort()).toEqual([
      "Alice",
      "Bob",
      "Chloé",
    ]);
    // Chloé took 60 / 120 = 50% of game2's time; fair share among 3 players is
    // 33%, so her time index is 0.5 × 3 × 100 = 150 (took 1.5× her share).
    const chloe = s.players.find(p => p.name === "Chloé");

    expect(chloe?.timeIndex).toBe(150);
  });

  it("player filter is presence-only: keeps their games, ranks everyone in them", () => {
    // Chloé is only in game2 → that game survives; all of its players rank.
    const s = computeGlobalStats([game1, game2], { playerIds: [CHLOE] });

    expect(s.gameCount).toBe(1);
    expect(s.players.map(p => p.name).sort()).toEqual([
      "Alice",
      "Bob",
      "Chloé",
    ]);
  });

  it("presence requires EVERY listed player in the game", () => {
    // Only game2 has both Bob and Chloé; game1 has neither Chloé.
    const s = computeGlobalStats([game1, game2], {
      playerIds: [BOB, CHLOE],
    });

    expect(s.gameCount).toBe(1);
  });

  it("filters by an inclusive end-date window", () => {
    // game1 ended 2026-07-01, game2 on 2026-07-02.
    expect(
      computeGlobalStats([game1, game2], { until: "2026-07-01" }).gameCount,
    ).toBe(1);
    expect(
      computeGlobalStats([game1, game2], { from: "2026-07-02" }).gameCount,
    ).toBe(1);
    expect(
      computeGlobalStats([game1, game2], {
        from: "2026-07-01",
        until: "2026-07-02",
      }).gameCount,
    ).toBe(2);
  });

  /** A minimal record: one boardgame, Alice vs Bob, a given winner. */
  function mk(
    id: string,
    boardgameId: BoardgameId,
    name: string,
    winner: PlayerId,
  ): GameStatsRecord {
    return {
      gameId: id as GameStatsRecord["gameId"],
      boardgameId,
      boardgameName: name,
      dice: null,
      endedAt: "2026-07-01T10:00:00Z",
      players: [
        {
          playerId: ALICE,
          name: "Alice",
          seatOrder: 1,
          isWinner: winner === ALICE,
          score: 5,
        },
        {
          playerId: BOB,
          name: "Bob",
          seatOrder: 0,
          isWinner: winner === BOB,
          score: 4,
        },
      ],
      turns: [turn(ALICE, 1, 20), turn(BOB, 1, 20)],
      diceRolls: [],
    };
  }

  it("breaks each player down by game with best/worst above the sample floor", () => {
    // Alice: Catan 3 games (2 wins → 67%), Wingspan 3 games (0 wins → 0%).
    const records = [
      mk("c1", CATAN, "Catan", ALICE),
      mk("c2", CATAN, "Catan", ALICE),
      mk("c3", CATAN, "Catan", BOB),
      mk("w1", WINGSPAN, "Wingspan", BOB),
      mk("w2", WINGSPAN, "Wingspan", BOB),
      mk("w3", WINGSPAN, "Wingspan", BOB),
    ];
    const alice = computeGlobalStats(records).players.find(
      p => p.name === "Alice",
    );

    expect(alice?.byGame).toHaveLength(2);
    expect(alice?.mostPlayedGame?.games).toBe(3);
    expect(alice?.bestGame?.boardgameName).toBe("Catan");
    expect(Math.round(alice?.bestGame?.winRate ?? 0)).toBe(67);
    expect(alice?.worstGame?.boardgameName).toBe("Wingspan");
    expect(alice?.worstGame?.winRate).toBe(0);
  });

  it("normalises the time index per game (100 = fair share) then averages", () => {
    // A 2-player Catan with an even split → both at their fair share (100).
    const evenGame: GameStatsRecord = {
      gameId: "t1" as GameStatsRecord["gameId"],
      boardgameId: CATAN,
      boardgameName: "Catan",
      dice: null,
      endedAt: "2026-07-01T10:00:00Z",
      players: [
        {
          playerId: ALICE,
          name: "Alice",
          seatOrder: 0,
          isWinner: true,
          score: null,
        },
        {
          playerId: BOB,
          name: "Bob",
          seatOrder: 0,
          isWinner: false,
          score: null,
        },
      ],
      turns: [turn(ALICE, 1, 20), turn(BOB, 1, 20)],
      diceRolls: [],
    };
    // A 3-player Wingspan where Alice hogs half the time (fair share is a third).
    const hogGame: GameStatsRecord = {
      gameId: "t2" as GameStatsRecord["gameId"],
      boardgameId: WINGSPAN,
      boardgameName: "Wingspan",
      dice: null,
      endedAt: "2026-07-02T10:00:00Z",
      players: [
        {
          playerId: ALICE,
          name: "Alice",
          seatOrder: 0,
          isWinner: false,
          score: null,
        },
        {
          playerId: BOB,
          name: "Bob",
          seatOrder: 0,
          isWinner: true,
          score: null,
        },
        {
          playerId: CHLOE,
          name: "Chloé",
          seatOrder: 0,
          isWinner: false,
          score: null,
        },
      ],
      turns: [turn(ALICE, 1, 60), turn(BOB, 1, 30), turn(CHLOE, 1, 30)],
      diceRolls: [],
    };

    const s = computeGlobalStats([evenGame, hogGame]);
    const alice = s.players.find(p => p.name === "Alice");
    const bob = s.players.find(p => p.name === "Bob");

    // Per game: Catan even → 100; Wingspan Alice 0.5×3×100 = 150.
    const aliceCatan = alice?.byGame.find(g => g.boardgameName === "Catan");
    const aliceWing = alice?.byGame.find(g => g.boardgameName === "Wingspan");

    expect(aliceCatan?.timeIndex).toBe(100);
    expect(aliceWing?.timeIndex).toBe(150);
    // Aggregated across games: mean(100, 150) = 125.
    expect(alice?.timeIndex).toBe(125);
    // Bob: 100 (Catan) and 0.25×3×100 = 75 (Wingspan) → mean 87.5.
    expect(bob?.timeIndex).toBe(87.5);
  });

  it("orders a player's games by how often they're played", () => {
    const records = [
      mk("c1", CATAN, "Catan", ALICE),
      mk("c2", CATAN, "Catan", BOB),
      mk("w1", WINGSPAN, "Wingspan", ALICE),
    ];
    const alice = computeGlobalStats(records).players.find(
      p => p.name === "Alice",
    );

    expect(alice?.byGame.map(g => g.boardgameName)).toEqual([
      "Catan",
      "Wingspan",
    ]);
    expect(alice?.mostPlayedGame?.games).toBe(2);
  });

  it("leaves best/worst null when no two games clear the sample floor", () => {
    // Alice has 1 game on each of two boardgames — neither reaches the floor.
    const records = [
      mk("c1", CATAN, "Catan", ALICE),
      mk("w1", WINGSPAN, "Wingspan", ALICE),
    ];
    const alice = computeGlobalStats(records).players.find(
      p => p.name === "Alice",
    );

    expect(alice?.byGame).toHaveLength(2);
    expect(alice?.mostPlayedGame).not.toBeNull();
    expect(alice?.bestGame).toBeNull();
    expect(alice?.worstGame).toBeNull();
  });

  it("returns zeros and no players when nothing matches", () => {
    const s = computeGlobalStats([game1], { boardgameIds: [WINGSPAN] });

    expect(s.gameCount).toBe(0);
    expect(s.avgActiveS).toBe(0);
    expect(s.avgRounds).toBe(0);
    expect(s.avgTurnS).toBe(0);
    expect(s.avgScore).toBeNull();
    expect(s.players).toEqual([]);
  });

  it("handles a game with no turns (winner counts, no time)", () => {
    const empty: GameStatsRecord = {
      gameId: "g3" as GameStatsRecord["gameId"],
      boardgameId: CATAN,
      boardgameName: "Catan",
      dice: null,
      endedAt: null,
      players: [
        {
          playerId: ALICE,
          name: "Alice",
          seatOrder: 0,
          isWinner: true,
          score: null,
        },
        {
          playerId: BOB,
          name: "Bob",
          seatOrder: 0,
          isWinner: false,
          score: null,
        },
      ],
      turns: [],
      diceRolls: [],
    };
    const s = computeGlobalStats([empty]);
    const alice = s.players.find(p => p.name === "Alice");

    expect(s.gameCount).toBe(1);
    expect(s.avgTurnS).toBe(0);
    expect(s.avgScore).toBeNull();
    // No played game → the time / round means have no basis (not NaN).
    expect(s.avgActiveS).toBe(0);
    expect(s.avgRounds).toBe(0);
    expect(alice?.avgTurnS).toBe(0);
    expect(alice?.avgOvertimeS).toBe(0);
    expect(alice?.avgPauseS).toBe(0);
    // No recorded time → the index has no basis.
    expect(alice?.timeIndex).toBeNull();
    expect(alice?.avgScore).toBeNull();
    expect(alice?.winRate).toBe(100);
  });

  it("a recorded-after-the-fact game (no turns) doesn't dilute time means", () => {
    // A finished game added by hand has no turn log; it counts for wins/scores
    // but must not drag down the time / round averages.
    const recorded: GameStatsRecord = {
      gameId: "g4" as GameStatsRecord["gameId"],
      boardgameId: CATAN,
      boardgameName: "Catan",
      dice: null,
      endedAt: "2026-07-03T10:00:00Z",
      players: [
        {
          playerId: ALICE,
          name: "Alice",
          seatOrder: 0,
          isWinner: false,
          score: 7,
        },
        {
          playerId: BOB,
          name: "Bob",
          seatOrder: 1,
          isWinner: true,
          score: 12,
        },
      ],
      turns: [],
      diceRolls: [],
    };
    const s = computeGlobalStats([game1, recorded]);

    // Both games count for the tally…
    expect(s.gameCount).toBe(2);
    // …but only game1 is timed: 160s / 1 played game, not / 2.
    expect(s.avgActiveS).toBe(160);
    expect(s.avgRounds).toBe(2);

    const alice = s.players.find(p => p.name === "Alice");
    // Alice's overtime (5s in game1) is averaged over her 1 played game, not 2.
    expect(alice?.games).toBe(2);
    expect(alice?.avgOvertimeS).toBe(5);
  });
});

describe("boardgameOptions", () => {
  it("lists each played boardgame once, sorted by name", () => {
    // game2 twice: the same boardgame must not show up as two options.
    const options = boardgameOptions([game2, game1, game2]);

    expect(options).toEqual([
      { id: CATAN, name: "Catan" },
      { id: WINGSPAN, name: "Wingspan" },
    ]);
  });

  it("offers nothing when no game has been played", () => {
    expect(boardgameOptions([])).toEqual([]);
  });
});

describe("coPlayerOptions", () => {
  const DAN = "p-dan" as PlayerId;

  function rec(
    id: string,
    players: Array<[PlayerId, string]>,
  ): GameStatsRecord {
    return {
      gameId: id as GameStatsRecord["gameId"],
      boardgameId: CATAN,
      boardgameName: "Catan",
      dice: null,
      endedAt: "2026-07-01T10:00:00Z",
      players: players.map(([playerId, name]) => ({
        playerId,
        name,
        seatOrder: 0,
        isWinner: false,
        score: null,
      })),
      turns: [],
      diceRolls: [],
    };
  }

  // Alice+Bob together; Alice+Chloé together; Bob+Dan together (Dan never with
  // Alice, Chloé never with Bob).
  const records = [
    rec("ab", [
      [ALICE, "Alice"],
      [BOB, "Bob"],
    ]),
    rec("ac", [
      [ALICE, "Alice"],
      [CHLOE, "Chloé"],
    ]),
    rec("bd", [
      [BOB, "Bob"],
      [DAN, "Dan"],
    ]),
  ];

  const names = (ids: string[]) =>
    coPlayerOptions(records, ids).map(o => o.name);

  it("offers every player, sorted by name, with no selection", () => {
    expect(names([])).toEqual(["Alice", "Bob", "Chloé", "Dan"]);
  });

  it("keeps only players who share a game with the selected one", () => {
    // Games with Alice: ab, ac → Alice, Bob, Chloé (Dan never played with her).
    expect(names([ALICE])).toEqual(["Alice", "Bob", "Chloé"]);
  });

  it("intersects across several selected players", () => {
    // Games with both Alice and Bob: only ab → Alice, Bob.
    expect(names([ALICE, BOB])).toEqual(["Alice", "Bob"]);
  });

  it("always includes the selected players themselves", () => {
    expect(names([DAN])).toEqual(["Bob", "Dan"]);
  });
});
