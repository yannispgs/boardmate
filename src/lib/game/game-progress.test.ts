import { describe, expect, it } from "vitest";

import type { GameStage } from "@/lib/domain";

import { gameProgress, playProgress, progressSummary } from "./game-progress";

const GAME = { round: 14, stage: 3 };

/** Wingspan's base calendar, once the tiles are laid out. */
const CALENDAR: GameStage[] = [8, 7, 6, 5].map((turns, index) => ({
  stage: index + 1,
  goalKey: `goal${index}`,
  goalParams: {},
  turns,
}));

describe("gameProgress", () => {
  it("counts laps for a game played round the table", () => {
    expect(gameProgress(GAME, null)).toEqual({ label: "Tour", count: 14 });
  });

  it("counts generations, under the game's own word, when it has stages", () => {
    expect(
      gameProgress(GAME, { label: "Génération", advance: "pass" }),
    ).toEqual({
      label: "Génération",
      count: 3,
    });
  });

  it("takes the word from the box rather than naming Terraforming Mars", () => {
    expect(
      gameProgress(GAME, { label: "Manche", advance: "schedule" }).label,
    ).toBe("Manche");
    expect(gameProgress(GAME, { label: "Ère", advance: "pass" }).label).toBe(
      "Ère",
    );
  });
});

describe("playProgress", () => {
  it("counts laps for a game played round the table", () => {
    expect(playProgress(GAME, null, [], null)).toBe("Tour 14");
    expect(playProgress(GAME, null, [], 20)).toBe("Tour 14 / 20");
  });

  it("names the generation, which has no known end", () => {
    expect(
      playProgress(GAME, { label: "Génération", advance: "pass" }, [], null),
    ).toBe("Génération 3");
  });

  it("names the manche and the lap inside it", () => {
    const stages = { label: "Manche", advance: "schedule" } as const;

    expect(playProgress({ round: 1, stage: 1 }, stages, CALENDAR, null)).toBe(
      "Manche 1 · Tour 1 / 8",
    );
    expect(playProgress({ round: 9, stage: 2 }, stages, CALENDAR, null)).toBe(
      "Manche 2 · Tour 1 / 7",
    );
    expect(playProgress({ round: 26, stage: 4 }, stages, CALENDAR, null)).toBe(
      "Manche 4 · Tour 5 / 5",
    );
  });

  it("still names the manche when the calendar is missing", () => {
    expect(
      playProgress(GAME, { label: "Manche", advance: "schedule" }, [], null),
    ).toBe("Manche 1 · Tour 14");
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
