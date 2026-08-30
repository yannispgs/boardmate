import { describe, expect, it } from "vitest";

import type { GameStatsRecord, PlayerId } from "@/lib/domain";
import {
  computeNeighbourStats,
  MIN_PARTIES,
  MIN_PARTNER_ENCOUNTERS,
  MIN_SEATS,
} from "./neighbour-stats";

const ann = "ann" as PlayerId;
const bob = "bob" as PlayerId;
const cat = "cat" as PlayerId;
const dan = "dan" as PlayerId;
const eve = "eve" as PlayerId;

const NAME: Record<string, string> = {
  ann: "Ann",
  bob: "Bob",
  cat: "Cat",
  dan: "Dan",
  eve: "Eve",
};

interface Seat {
  id: PlayerId;
  score?: number | null;
  winner?: boolean;
}

/**
 * One party seated in a circle. `piles[i]` is the pile shared by seat `i` and
 * the next one round, so each seat's breakdown is built the way the app records
 * it — `null` for a pile nobody wrote down, and `piles: null` for a party
 * played before the piles were kept at all.
 */
function circle(
  seats: Seat[],
  piles: Array<number | null> | null,
  gameId = "g",
): GameStatsRecord {
  const n = seats.length;

  return {
    gameId: gameId as never,
    boardgameId: "b" as never,
    boardgameName: "Splito",
    dice: null,
    endedAt: "2026-01-01T00:00:00Z",
    players: seats.map((seat, i) => ({
      playerId: seat.id,
      name: NAME[seat.id],
      seatOrder: i,
      isWinner: seat.winner ?? false,
      score: seat.score ?? null,
      scoreBreakdown:
        piles === null ? null : breakdown(piles[(i - 1 + n) % n], piles[i % n]),
    })),
    turns: [],
    diceRolls: [],
  };
}

/** A seat's two piles, each key left out when that pile was never recorded. */
function breakdown(
  left: number | null,
  right: number | null,
): Record<string, number> {
  return {
    ...(left === null ? {} : { left }),
    ...(right === null ? {} : { right }),
  };
}

/**
 * The party their five-player evening actually looked like. Scores are the real
 * product of the two flanking piles, so the fixture obeys the rule it measures.
 */
function evening(gameId = "g-1"): GameStatsRecord {
  return circle(
    [
      { id: ann, score: 45, winner: true },
      { id: bob, score: 20 },
      { id: cat, score: 8 },
      { id: dan, score: 2 },
      { id: eve, score: 9 },
    ],
    [5, 4, 2, 1, 9],
    gameId,
  );
}

/** The board's line for one player, or undefined when he isn't listed. */
function lineOf(
  board: ReturnType<typeof computeNeighbourStats>,
  playerId: PlayerId,
) {
  return board.stats.find(s => s.playerId === playerId);
}

describe("computeNeighbourStats", () => {
  it("says nothing at all when no party has been played", () => {
    const board = computeNeighbourStats([], "highest", 1);

    expect(board.stats).toEqual([]);
    expect(board.pileAverage).toBeNull();
    expect(board.parties).toBe(0);
  });

  // At three seats each player's two neighbours ARE the rest of the table, so
  // « à côté de X » names everybody and the figure becomes the table average.
  it("throws out a table of three, where everyone is everyone's neighbour", () => {
    const board = computeNeighbourStats(
      [
        circle(
          [
            { id: ann, score: 9, winner: true },
            { id: bob, score: 6 },
            { id: cat, score: 4 },
          ],
          [3, 2, 3],
        ),
      ],
      "highest",
      1,
    );

    expect(board.parties).toBe(0);
    expect(board.stats).toEqual([]);
  });

  it("gives every seat exactly two neighbours, the circle closing on the first", () => {
    const board = computeNeighbourStats([evening()], "highest", 1);

    expect(board.stats).toHaveLength(5);
    expect(board.stats.every(s => s.encounters === 2)).toBe(true);
    // Ann sits at the top of the circle: her neighbours are the seat after her
    // and the seat that closes the ring back onto her, not two seats along.
    expect(
      lineOf(board, ann)
        ?.partners.map(p => p.playerId)
        .sort(),
    ).toEqual(["bob", "eve"]);
  });

  it("averages where a player's neighbours finished, on the scale that runs down", () => {
    const board = computeNeighbourStats([evening()], "highest", 1);

    // Cat sits between Bob (2nd of 5 → 0.25) and Dan (last → 1).
    expect(lineOf(board, cat)?.neighbourPosition).toBeCloseTo(0.625);
    // Ann sits between Bob (0.25) and Eve (3rd → 0.5).
    expect(lineOf(board, ann)?.neighbourPosition).toBeCloseTo(0.375);
  });

  it("counts the neighbour seats that won, not the parties", () => {
    const board = computeNeighbourStats([evening()], "highest", 1);

    // Ann won, so both her neighbours have a winner on one side out of two.
    expect(lineOf(board, bob)?.neighbourWinRate).toBe(0.5);
    expect(lineOf(board, eve)?.neighbourWinRate).toBe(0.5);
    expect(lineOf(board, cat)?.neighbourWinRate).toBe(0);
  });

  it("reads the two piles a seat has a hand in, and averages every pile once", () => {
    const board = computeNeighbourStats([evening()], "highest", 1);

    // Dan's piles are the 2 he built with Cat and the 1 he built with Eve.
    expect(lineOf(board, dan)?.sharedPile).toBe(1.5);
    // Five piles for five seats, each counted a single time: (5+4+2+1+9)/5.
    expect(board.pileAverage).toBeCloseTo(4.2);
  });

  it("turns the scale over on a game the smallest total wins", () => {
    const board = computeNeighbourStats([evening()], "lowest", 1);

    // Dan now wins with 2, so Cat's neighbours are Bob (4th → 0.75) and Dan (0).
    expect(lineOf(board, cat)?.neighbourPosition).toBeCloseTo(0.375);
  });

  it("lists the heaviest curse first, and sinks a player with no placement", () => {
    const board = computeNeighbourStats(
      [
        evening(),
        circle(
          [{ id: ann }, { id: bob }, { id: cat }, { id: dan }],
          [1, 1, 1, 1],
          "g-2",
        ),
      ],
      "highest",
      1,
    );

    // Eve only played the scored party; the four others also played the
    // unscored one, which dilutes nothing but adds no placement.
    expect(board.stats[0].playerId).toBe(cat);
    expect(board.stats.at(-1)?.neighbourPosition).not.toBeNull();
  });

  it("holds back a player who hasn't played enough parties yet", () => {
    const board = computeNeighbourStats([evening()], "highest");

    expect(MIN_PARTIES).toBe(4);
    expect(board.stats).toEqual([]);
    // The party still counted — it is the players who are held back, not it.
    expect(board.parties).toBe(1);
  });

  it("lists a player as soon as he reaches the floor", () => {
    const parties = [1, 2, 3, 4].map(i => evening(`g-${i}`));
    const board = computeNeighbourStats(parties, "highest");

    expect(board.stats).toHaveLength(5);
    expect(lineOf(board, ann)?.parties).toBe(4);
    expect(lineOf(board, ann)?.encounters).toBe(8);
  });
});

describe("computeNeighbourStats — what a thin sheet still says", () => {
  it("keeps the piles of a party nobody was scored in, but draws no placement", () => {
    const board = computeNeighbourStats(
      [
        circle(
          [{ id: ann }, { id: bob, winner: true }, { id: cat }, { id: dan }],
          [4, 6, 8, 2],
        ),
      ],
      "highest",
      1,
    );

    expect(lineOf(board, ann)?.neighbourPosition).toBeNull();
    // The win and the piles were written down, so they are read.
    expect(lineOf(board, ann)?.neighbourWinRate).toBe(0.5);
    expect(lineOf(board, ann)?.sharedPile).toBe(3);
  });

  it("draws the placement of a party played before the piles were kept", () => {
    const board = computeNeighbourStats(
      [
        circle(
          [
            { id: ann, score: 25, winner: true },
            { id: bob, score: 15 },
            { id: cat, score: 12 },
            { id: dan, score: 18 },
          ],
          null,
        ),
      ],
      "highest",
      1,
    );

    expect(lineOf(board, ann)?.neighbourPosition).not.toBeNull();
    expect(lineOf(board, ann)?.sharedPile).toBeNull();
    expect(board.pileAverage).toBeNull();
  });

  it("reads the one pile of a party where only the other was written down", () => {
    const board = computeNeighbourStats(
      [
        circle(
          [{ id: ann }, { id: bob }, { id: cat }, { id: dan }],
          [6, null, null, null],
        ),
      ],
      "highest",
      1,
    );

    // Ann has a hand in the pile before her seat and the one after it; only the
    // one she shares with Bob was recorded, so it is the whole of her average.
    expect(lineOf(board, ann)?.sharedPile).toBe(6);
    expect(board.pileAverage).toBe(6);
  });
});

describe("computeNeighbourStats — one partner at a time", () => {
  it("counts a pairing again each time it comes back round", () => {
    const board = computeNeighbourStats(
      [evening("g-1"), evening("g-2")],
      "highest",
      1,
    );
    const withBob = lineOf(board, ann)?.partners.find(p => p.playerId === bob);

    expect(withBob?.encounters).toBe(2);
    expect(withBob?.sharedPile).toBe(5);
    expect(withBob?.position).toBeCloseTo(0.25);
    expect(withBob?.name).toBe("Bob");
  });

  it("puts the thinnest pile first, and a pile never written down last", () => {
    const board = computeNeighbourStats(
      [
        circle(
          [{ id: ann }, { id: bob }, { id: cat }, { id: dan }],
          [9, null, null, 3],
        ),
      ],
      "highest",
      1,
    );

    // Ann shares 3 with Dan and 9 with Bob; Cat's two piles were never kept.
    expect(lineOf(board, ann)?.partners.map(p => p.sharedPile)).toEqual([3, 9]);
    expect(lineOf(board, cat)?.partners.map(p => p.sharedPile)).toEqual([
      null,
      null,
    ]);
  });

  it("holds a pairing at arm's length below the encounters floor", () => {
    const parties = [1, 2, 3, 4].map(i => evening(`g-${i}`));
    const board = computeNeighbourStats(parties, "highest");
    const withBob = lineOf(board, ann)?.partners.find(p => p.playerId === bob);

    expect(MIN_PARTNER_ENCOUNTERS).toBe(6);
    // Four evenings side by side is still under the bar the screen greys at.
    expect(withBob?.encounters).toBeLessThan(MIN_PARTNER_ENCOUNTERS);
  });
});

describe("MIN_SEATS", () => {
  it("is the smallest circle where a neighbour isn't the whole table", () => {
    expect(MIN_SEATS).toBe(4);
  });
});
