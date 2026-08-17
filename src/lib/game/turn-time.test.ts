import { describe, expect, it } from "vitest";

import { hasPlayStats, tracksPlayerTime } from "./turn-time";

describe("tracksPlayerTime", () => {
  it("counts a player's time on a game played in individual turns", () => {
    expect(tracksPlayerTime({ turnMode: "sequential", timed: true })).toBe(
      true,
    );
  });

  it("refuses it on a simultaneous game — a round belongs to nobody", () => {
    expect(tracksPlayerTime({ turnMode: "simultaneous", timed: true })).toBe(
      false,
    );
  });

  it("refuses it on a game the app never puts a clock on", () => {
    // Papayoo, Odin: no turn is recorded at all, so there is no time to split.
    expect(tracksPlayerTime({ turnMode: "sequential", timed: false })).toBe(
      false,
    );
  });

  it("refuses it on a game that is neither timed nor turn-based", () => {
    expect(tracksPlayerTime({ turnMode: "simultaneous", timed: false })).toBe(
      false,
    );
  });
});

describe("hasPlayStats", () => {
  it("summarises a timed game, which recorded every turn", () => {
    expect(hasPlayStats({ timed: true, stages: null })).toBe(true);
  });

  it("summarises a game counted manche by manche — the manches are the story", () => {
    expect(
      hasPlayStats({
        timed: false,
        stages: { label: "Manche", advance: "manual" },
      }),
    ).toBe(true);
  });

  it("has nothing to summarise on an untimed game with no manches", () => {
    // Papayoo: no turn, no manche, nothing but the scores already on the sheet.
    expect(hasPlayStats({ timed: false, stages: null })).toBe(false);
  });
});
