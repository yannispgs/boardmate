import { describe, expect, it } from "vitest";

import { gameProgress, progressSummary } from "./game-progress";

const GAME = { round: 14, stage: 3 };

describe("gameProgress", () => {
  it("counts laps for a game played round the table", () => {
    expect(gameProgress(GAME, null)).toEqual({ label: "Tour", count: 14 });
  });

  it("counts generations, under the game's own word, when it has stages", () => {
    expect(gameProgress(GAME, { label: "Génération" })).toEqual({
      label: "Génération",
      count: 3,
    });
  });

  it("takes the word from the box rather than naming Terraforming Mars", () => {
    expect(gameProgress(GAME, { label: "Manche" }).label).toBe("Manche");
    expect(gameProgress(GAME, { label: "Ère" }).label).toBe("Ère");
  });
});

describe("progressSummary", () => {
  it("counts a lasted game out in its own words", () => {
    expect(progressSummary({ label: "Génération", count: 12 })).toBe(
      "12 générations",
    );
    expect(progressSummary({ label: "Tour", count: 7 })).toBe("7 tours");
  });

  it("stays singular at one", () => {
    expect(progressSummary({ label: "Tour", count: 1 })).toBe("1 tour");
    expect(progressSummary({ label: "Génération", count: 1 })).toBe(
      "1 génération",
    );
  });
});
