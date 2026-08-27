import { describe, expect, it } from "vitest";

import { hasPlayStats, tracksPlayerTime, tracksPlayerTurns } from "./turn-time";

describe("tracksPlayerTurns", () => {
  it("hands the turn round the table on a timed, sequential game", () => {
    expect(tracksPlayerTurns({ turnMode: "sequential", timed: true })).toBe(
      true,
    );
  });

  it("moves no turn on a simultaneous game — the round is the table's", () => {
    expect(tracksPlayerTurns({ turnMode: "simultaneous", timed: true })).toBe(
      false,
    );
  });

  it("moves no turn on an untimed game, whoever the launch seated first", () => {
    // Papayoo, Odin: the party carries a current player from the first second
    // to the last, so reading it as « whose turn is it » names him at random.
    expect(tracksPlayerTurns({ turnMode: "sequential", timed: false })).toBe(
      false,
    );
  });

  it("moves no turn on a game that is neither timed nor turn-based", () => {
    expect(tracksPlayerTurns({ turnMode: "simultaneous", timed: false })).toBe(
      false,
    );
  });
});

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
