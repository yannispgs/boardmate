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

/** A finished party reduced to what the basket rule looks at. */
function record(
  gameId: string,
  boardgameId: BoardgameId,
  seats: number,
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
    turns: [],
    diceRolls: [],
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
});
