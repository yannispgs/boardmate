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

import { type ChainableGame, chainedGame, justEnded } from "./chained-game";

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

describe("justEnded", () => {
  const now = Date.parse("2026-09-04T21:00:00.000Z");

  const at = (iso: string) => {
    return justEnded(iso, now);
  };

  it.each([
    ["the moment it closed", "2026-09-04T21:00:00.000Z"],
    ["a quarter of an hour ago", "2026-09-04T20:45:00.000Z"],
    ["just inside the hour", "2026-09-04T20:00:01.000Z"],
  ])("keeps the table sat down %s", (_case, endedAt) => {
    expect(at(endedAt)).toBe(true);
  });

  it.each([
    ["on the hour itself", "2026-09-04T20:00:00.000Z"],
    ["earlier the same evening", "2026-09-04T18:30:00.000Z"],
    ["a month ago", "2026-08-04T21:00:00.000Z"],
  ])("lets the table get up %s", (_case, endedAt) => {
    expect(at(endedAt)).toBe(false);
  });

  it("forgives a closing time a moment ahead of the reading clock", () => {
    expect(at("2026-09-04T21:00:30.000Z")).toBe(true);
  });

  it("sits a party recorded away from the app outside the window", () => {
    expect(at("2025-01-03T11:00:00.000Z")).toBe(false);
  });

  it("offers nothing on a party that never closed", () => {
    expect(justEnded(null, now)).toBe(false);
  });

  it("offers nothing on a closing time that is not one", () => {
    expect(justEnded("hier soir", now)).toBe(false);
  });
});
