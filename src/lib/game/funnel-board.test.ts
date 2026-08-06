import { describe, expect, it } from "vitest";

import type {
  ScenarioBoardSpec,
  ScenarioSpec,
} from "@/lib/catan/scenario-spec";
import type {
  Extension,
  ExtensionScenario,
  ExtensionScenarioId,
} from "@/lib/domain";
import { funnelBoard } from "./funnel-board";

const board = (players: number[]): ScenarioBoardSpec => ({
  players,
  width: 6,
  zones: [],
});

const spec = (boards: ScenarioBoardSpec[]): ScenarioSpec => ({
  name: "Les quatre îles",
  targetScore: 14,
  boards,
});

function scenario(
  id: string,
  boardSpec: ScenarioSpec | null,
): ExtensionScenario {
  return {
    id: id as ExtensionScenarioId,
    extensionId: "marins" as never,
    name: id,
    targetScore: 14,
    isOfficial: true,
    boardSpec,
    sortOrder: 0,
  };
}

function ext(
  partial: Omit<Partial<Extension>, "id"> & { id: string },
): Extension {
  return {
    baseGameId: "bg" as never,
    key: null,
    name: partial.id,
    configFields: [],
    scoringDelta: null,
    roundGoals: [],
    targetModifier: 0,
    hasScenarios: false,
    changesBoard: false,
    isActive: true,
    sortOrder: 0,
    scenarios: [],
    ...partial,
    id: partial.id as never,
  };
}

const catan = { boardGenerator: "catan" } as const;

describe("funnelBoard", () => {
  it("offers nothing for a game played on no generated board", () => {
    expect(funnelBoard({ boardGenerator: null }, [], {}, 4)).toBeNull();
  });

  it("offers the base board at the size the seats call for", () => {
    expect(funnelBoard(catan, [], {}, 4)).toEqual({
      kind: "base",
      size: "base",
    });
    expect(funnelBoard(catan, [], {}, 5)).toEqual({
      kind: "base",
      size: "extension",
    });
  });

  it("ignores an extension that leaves the board alone", () => {
    const villes = ext({ id: "vc" });

    expect(funnelBoard(catan, [villes], {}, 6)).toEqual({
      kind: "base",
      size: "extension",
    });
  });

  it("offers the map of the chosen scenario for the seated players", () => {
    const map = board([3, 4]);
    const marins = ext({
      id: "marins",
      changesBoard: true,
      hasScenarios: true,
      scenarios: [scenario("s1", spec([map, board([5, 6])]))],
    });

    expect(funnelBoard(catan, [marins], { marins: "s1" as never }, 4)).toEqual({
      kind: "scenario",
      spec: spec([map, board([5, 6])]),
      board: map,
      players: 4,
    });
  });

  it("offers nothing when the board-changing extension has no scenario yet", () => {
    const marins = ext({
      id: "marins",
      changesBoard: true,
      hasScenarios: true,
      scenarios: [scenario("s1", spec([board([3, 4])]))],
    });

    expect(funnelBoard(catan, [marins], {}, 4)).toBeNull();
  });

  it("offers nothing when the chosen scenario has no map at all", () => {
    const marins = ext({
      id: "marins",
      changesBoard: true,
      hasScenarios: true,
      scenarios: [scenario("s1", null)],
    });

    expect(
      funnelBoard(catan, [marins], { marins: "s1" as never }, 4),
    ).toBeNull();
  });

  it("offers nothing when the map was never drawn for this many players", () => {
    const marins = ext({
      id: "marins",
      changesBoard: true,
      hasScenarios: true,
      scenarios: [scenario("s1", spec([board([3, 4])]))],
    });

    expect(
      funnelBoard(catan, [marins], { marins: "s1" as never }, 6),
    ).toBeNull();
  });

  it("takes the first board-changing extension that has a map to draw", () => {
    const map = board([4]);
    const mapless = ext({ id: "fog", changesBoard: true });
    const marins = ext({
      id: "marins",
      changesBoard: true,
      scenarios: [scenario("s1", spec([map]))],
    });

    const chosen = funnelBoard(
      catan,
      [mapless, marins],
      { marins: "s1" as never },
      4,
    );

    expect(chosen).toMatchObject({ kind: "scenario", board: map });
  });
});
