import { describe, expect, it } from "vitest";

import { tracksPlayerTime } from "./turn-time";

describe("tracksPlayerTime", () => {
  it("counts a player's time on a game played in individual turns", () => {
    expect(tracksPlayerTime({ turnMode: "sequential", stages: null })).toBe(
      true,
    );
  });

  it("counts it on a game played in stages somebody still plays through", () => {
    expect(
      tracksPlayerTime({
        turnMode: "sequential",
        stages: { label: "Génération", advance: "pass" },
      }),
    ).toBe(true);
  });

  it("refuses it on a simultaneous game — a round belongs to nobody", () => {
    expect(tracksPlayerTime({ turnMode: "simultaneous", stages: null })).toBe(
      false,
    );
  });

  it("refuses it on a game counted manche by manche — no turn is recorded", () => {
    expect(
      tracksPlayerTime({
        turnMode: "sequential",
        stages: { label: "Manche", advance: "manual" },
      }),
    ).toBe(false);
  });

  it("treats a missing stage spec as a game played in laps", () => {
    expect(tracksPlayerTime({ turnMode: "sequential" })).toBe(true);
  });
});
