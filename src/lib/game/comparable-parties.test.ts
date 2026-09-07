import { describe, expect, it } from "vitest";

import type {
  BoardgameId,
  GameId,
  GameStatsRecord,
  PlayerId,
} from "@/lib/domain";
import type { PartyIdentity } from "./comparable-parties";
import { comparableParties } from "./comparable-parties";

const MARS = "bg-mars" as BoardgameId;
const CATAN = "bg-catan" as BoardgameId;

/** One turn — enough for a party to count as having been timed at all. */
const A_TURN = {
  playerId: "p-0" as PlayerId,
  round: 1,
  durationS: 60,
  pauseDurationS: 0,
  overtimeS: 0,
};

/**
 * A finished party reduced to what the basket rule looks at — timed by default,
 * since a party that left no trail is now the exception the rule is about.
 */
function record(
  gameId: string,
  boardgameId: BoardgameId,
  seats: number,
  trail: Partial<Pick<GameStatsRecord, "turns" | "phaseTimes">> = {},
): GameStatsRecord {
  return {
    gameId: gameId as GameId,
    boardgameId,
    boardgameName: "—",
    dice: null,
    endedAt: null,
    players: Array.from({ length: seats }, (_, seat) => {
      return {
        playerId: `p-${seat}` as PlayerId,
        name: `J${seat}`,
        seatOrder: seat,
        isWinner: seat === 0,
        score: null,
      };
    }),
    turns: [A_TURN],
    diceRolls: [],
    ...trail,
  };
}

const TONIGHT: PartyIdentity = {
  id: "g-tonight" as GameId,
  boardgameId: MARS,
  playerCount: 3,
  atTableSize: false,
};

describe("comparableParties", () => {
  const history = [
    record("g-1", MARS, 3),
    record("g-2", MARS, 4),
    record("g-tonight", MARS, 3),
    record("g-3", CATAN, 3),
  ];

  it("keeps the other parties of the same game, tonight excepted", () => {
    const basket = comparableParties(history, TONIGHT);

    expect(basket.map(r => r.gameId)).toEqual(["g-1", "g-2"]);
  });

  // A game the flag leaves out barely moves with the seat count, and the wider
  // basket is the fuller one.
  it("ignores the table size unless the game says it counts", () => {
    const basket = comparableParties(history, {
      ...TONIGHT,
      atTableSize: true,
    });

    expect(basket.map(r => r.gameId)).toEqual(["g-1"]);
  });

  // A party keyed in after the fact measures as zero on every figure, and a
  // zero in the basket pins the low end of every bar drawn against it.
  it("drops a party that left no trail of the time it took", () => {
    const basket = comparableParties(
      [record("g-1", MARS, 3), record("g-typed", MARS, 3, { turns: [] })],
      TONIGHT,
    );

    expect(basket.map(r => r.gameId)).toEqual(["g-1"]);
  });

  // A generation closed without anybody taking a turn still spent real minutes
  // drafting, and the phase rows hold them.
  it("keeps a party timed by its phases alone", () => {
    const basket = comparableParties(
      [
        record("g-phases", MARS, 3, {
          turns: [],
          phaseTimes: [{ stage: 1, phaseKey: "draft", durationS: 90 }],
        }),
      ],
      TONIGHT,
    );

    expect(basket.map(r => r.gameId)).toEqual(["g-phases"]);
  });
});
