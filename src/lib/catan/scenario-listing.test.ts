import { describe, expect, it } from "vitest";

import {
  matchesPlayers,
  playerCountsLabel,
  playerCountsOf,
  scenarioPlayers,
  scenarioSummary,
  servesPlayers,
} from "./scenario-listing";
import type {
  ScenarioBoardSpec,
  ScenarioSpec,
  ScenarioZone,
} from "./scenario-spec";

/** A three-space zone, land only, with the harbours and terrain given. */
function zone(overrides: Partial<ScenarioZone> = {}): ScenarioZone {
  return {
    name: "Île",
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ],
    terrainCounts: { forest: 2, desert: 1 },
    numberTokens: [4, 5],
    ...overrides,
  };
}

/** A scenario made of the boards given, each under its own player counts. */
function spec(...boards: Partial<ScenarioBoardSpec>[]): ScenarioSpec {
  return {
    name: "Test",
    targetScore: 12,
    boards: boards.map(board => ({
      players: [3],
      zones: [zone()],
      ...board,
    })),
  };
}

describe("scenarioPlayers", () => {
  it("gathers the counts of every board, in order and without repeats", () => {
    const counts = scenarioPlayers(
      spec({ players: [5, 6] }, { players: [4, 3] }, { players: [3] }),
    );

    expect(counts).toEqual([3, 4, 5, 6]);
  });
});

describe("servesPlayers", () => {
  it("knows whether a scenario has a map for that many", () => {
    const scenario = spec({ players: [3, 4] });

    expect(servesPlayers(scenario, 4)).toBe(true);
    expect(servesPlayers(scenario, 6)).toBe(false);
  });
});

describe("playerCountsOf", () => {
  it("gathers what a whole list can seat", () => {
    expect(
      playerCountsOf([spec({ players: [3, 4] }), spec({ players: [6] })]),
    ).toEqual([3, 4, 6]);
  });
});

describe("matchesPlayers", () => {
  it("keeps everything when nothing in particular is asked for", () => {
    expect(matchesPlayers(spec({ players: [3] }), "all")).toBe(true);
  });

  it("keeps only what seats the count asked for", () => {
    const scenario = spec({ players: [3, 4] });

    expect(matchesPlayers(scenario, 3)).toBe(true);
    expect(matchesPlayers(scenario, 5)).toBe(false);
  });
});

describe("playerCountsLabel", () => {
  it("reads consecutive counts as one span", () => {
    expect(playerCountsLabel([3, 4, 5, 6])).toBe("3-6 joueurs");
    expect(playerCountsLabel([4])).toBe("4 joueurs");
  });

  it("breaks a gap into two spans rather than lying about it", () => {
    expect(playerCountsLabel([3, 4, 6])).toBe("3-4, 6 joueurs");
  });

  it("says so when there is no board to seat anybody", () => {
    expect(playerCountsLabel([])).toBe("Aucun plateau");
    expect(playerCountsLabel([1])).toBe("1 joueur");
  });
});

describe("scenarioSummary", () => {
  it("leads with who the scenario seats", () => {
    expect(scenarioSummary(spec({ players: [3, 4] }))).toBe("3-4 joueurs");
  });

  it("counts the harbours of the bags, the zones' and the board's", () => {
    const summary = scenarioSummary(
      spec({
        zones: [zone({ ports: { types: ["wood", "generic"] } })],
        ports: { types: ["ore"] },
      }),
    );

    expect(summary).toBe("3 joueurs · 3 ports");
  });

  it("names a lone harbour in the singular", () => {
    expect(
      scenarioSummary(spec({ zones: [zone({ ports: { types: ["wood"] } })] })),
    ).toBe("3 joueurs · 1 port");
  });

  it("calls out the gold rivers and the fog, wherever they come from", () => {
    const summary = scenarioSummary(
      spec({
        zones: [
          zone({ terrainCounts: { gold: 3 }, numberTokens: [4, 5, 6] }),
          zone({ name: "Brume", hidden: true }),
        ],
        statics: [{ cell: { q: 9, r: 0 }, terrain: "gold", number: 9 }],
      }),
    );

    expect(summary).toBe("3 joueurs · 4 rivières d'or · 3 tuiles face cachée");
  });

  it("says nothing of what a scenario does not have", () => {
    expect(scenarioSummary(spec({ players: [3] }))).toBe("3 joueurs");
  });

  it("spans the boards when they do not hold the same", () => {
    // The map for five players carries two harbours more than the one for
    // three: the list gives the range rather than one board's word.
    const summary = scenarioSummary(
      spec(
        { players: [3], zones: [zone({ ports: { types: ["wood"] } })] },
        {
          players: [5],
          zones: [zone({ ports: { types: ["wood", "ore", "grain"] } })],
        },
      ),
    );

    expect(summary).toBe("3, 5 joueurs · 1-3 ports");
  });

  it("has nothing to say about a scenario with no board at all", () => {
    expect(scenarioSummary(spec())).toBe("Aucun plateau");
  });
});
