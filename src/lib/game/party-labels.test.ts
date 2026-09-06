import { describe, expect, it } from "vitest";

import type { PartyNaming } from "./party-labels";
import { PLAIN_NAMING, partyLabel, partyValue } from "./party-labels";

/** Terraforming Mars: generations, and turns taken in one phase of them. */
const MARS: PartyNaming = {
  roundLabel: "Génération",
  turnPhaseLabel: "Projets",
};

describe("partyLabel", () => {
  it("calls a lap a lap on a game that turns in laps", () => {
    expect(partyLabel("rounds", PLAIN_NAMING)).toBe("Tours");
    expect(partyLabel("avgRound", PLAIN_NAMING)).toBe("Tour de table");
    expect(partyLabel("avgTurn", PLAIN_NAMING)).toBe("Tour moyen");
  });

  // « Tours 14 » on a Terraforming Mars names something nobody at that table
  // would recognise.
  it("counts in the word the game itself uses", () => {
    expect(partyLabel("rounds", MARS)).toBe("Générations");
  });

  // The two averages come off the turn log, which on Mars only covers one of
  // the three phases; unqualified they would read as the whole evening.
  it("says which phase the two turn averages price", () => {
    expect(partyLabel("avgRound", MARS)).toBe("Tour de table — Projets");
    expect(partyLabel("avgTurn", MARS)).toBe("Tour moyen — Projets");
  });

  it("leaves the party's own durations alone, phases or not", () => {
    expect(partyLabel("playTime", MARS)).toBe("Temps de jeu");
    expect(partyLabel("totalTime", MARS)).toBe("Temps total");
    expect(partyLabel("pauseTime", MARS)).toBe("Temps en pause");
    expect(partyLabel("overtime", MARS)).toBe("Dépassement");
  });
});

describe("partyValue", () => {
  it("writes a duration as a duration and a count as a number", () => {
    expect(partyValue("playTime", 90)).toBe("1:30");
    expect(partyValue("rounds", 14)).toBe("14");
  });

  it("rounds a mean to the second rather than print a fraction of one", () => {
    expect(partyValue("avgTurn", 90.4)).toBe("1:30");
  });
});
