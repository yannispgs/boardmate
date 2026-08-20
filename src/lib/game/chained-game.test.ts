import { describe, expect, it } from "vitest";

import type {
  BoardgameId,
  ConfigId,
  ExtensionId,
  ExtensionScenarioId,
  GameSessionId,
  PlayerId,
  ScoringSpec,
} from "@/lib/domain";

import { type ChainableGame, chainedGame } from "./chained-game";

const PAPAYOO: ScoringSpec = {
  timing: "final",
  entry: "total",
  winCondition: { type: "lowest" },
  totalSum: 250,
};

/** The party on the table, with only what dealing the next one reads. */
function game(patch: Partial<ChainableGame> = {}): ChainableGame {
  return {
    sessionId: "evening" as GameSessionId,
    boardgameId: "papayoo" as BoardgameId,
    configId: null,
    configValues: null,
    boardgame: { scoring: PAPAYOO },
    players: [
      { playerId: "a" as PlayerId, seatOrder: 0 },
      { playerId: "b" as PlayerId, seatOrder: 1 },
    ],
    extensions: [],
    ...patch,
  };
}

describe("chainedGame", () => {
  it("sits the same table back down, in the same seats", () => {
    expect(chainedGame(game()).playerIds).toEqual(["a", "b"]);
  });

  it("reads the seats rather than the order the players came in", () => {
    const shuffled = game({
      players: [
        { playerId: "c" as PlayerId, seatOrder: 2 },
        { playerId: "a" as PlayerId, seatOrder: 0 },
        { playerId: "b" as PlayerId, seatOrder: 1 },
      ],
    });

    expect(chainedGame(shuffled).playerIds).toEqual(["a", "b", "c"]);
  });

  it("keeps the config the party was launched with", () => {
    const configured = game({
      configId: "cfg" as ConfigId,
      configValues: { timerBaseS: 90 },
    });
    const next = chainedGame(configured);

    expect(next.configId).toBe("cfg");
    expect(next.configValues).toEqual({ timerBaseS: 90 });
  });

  it("keeps the extensions, each with the scenario it was set up with", () => {
    const extended = game({
      extensions: [
        {
          id: "marins" as ExtensionId,
          scenarioId: "quatre-iles" as ExtensionScenarioId,
        },
        { id: "villes" as ExtensionId, scenarioId: null },
      ],
    });
    const next = chainedGame(extended);

    expect(next.extensionIds).toEqual(["marins", "villes"]);
    // An extension with no scenario to pick leaves nothing behind.
    expect(next.scenarioByExtension).toEqual({ marins: "quatre-iles" });
  });

  it("leaves the scores empty on a game counted at the end", () => {
    expect(chainedGame(game()).initialScore).toBeNull();
  });

  it("seats a live-scored game at its starting score", () => {
    const catan = game({
      boardgame: {
        scoring: {
          timing: "live",
          entry: "total",
          winCondition: { type: "highest" },
          startScore: 2,
        },
      },
    });

    expect(chainedGame(catan).initialScore).toBe(2);
  });

  it("files the next deal under the same evening", () => {
    expect(chainedGame(game()).sessionId).toBe("evening");
  });
});
