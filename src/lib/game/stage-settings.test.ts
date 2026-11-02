import { describe, expect, it } from "vitest";

import type { StageSpec } from "@/lib/domain";
import {
  STAGE_COUNT_MAX,
  STAGE_LABEL_MAX,
  stageCountKind,
  stageSettingsError,
  withStageSettings,
} from "./stage-settings";

const LUZ: StageSpec = {
  label: "Donne",
  advance: "manual",
  count: 4,
  bet: { win: 10, hedgedWin: 5, missPerTrick: 5, tricks: 10, hedgeLabel: "S" },
};
const WINGSPAN: StageSpec = {
  label: "Manche",
  advance: "schedule",
  schedule: [8, 7, 6, 5],
};
const ODIN: StageSpec = { label: "Manche", advance: "manual", maxPoints: 9 };

describe("stageCountKind", () => {
  it("tells a fixed count, a calendar and an open-ended game apart", () => {
    expect(stageCountKind(LUZ)).toBe("fixed");
    expect(stageCountKind(WINGSPAN)).toBe("schedule");
    expect(stageCountKind(ODIN)).toBe("open");
    expect(stageCountKind({ label: "Manche", advance: "schedule" })).toBe(
      "open",
    );
  });
});

describe("stageSettingsError", () => {
  it("accepts a name and a count within bounds", () => {
    expect(stageSettingsError({ label: " Donne ", count: 4 })).toBeNull();
  });

  it("refuses an empty or too long name", () => {
    expect(stageSettingsError({ label: "  ", count: 4 })).toBe(
      "Donne un nom à la manche.",
    );
    expect(
      stageSettingsError({ label: "x".repeat(STAGE_LABEL_MAX + 1), count: 4 }),
    ).toMatch(/caractères/);
  });

  it("refuses a count that is not a whole number within bounds", () => {
    for (const count of [0, 2.5, STAGE_COUNT_MAX + 1, Number.NaN]) {
      expect(stageSettingsError({ label: "Donne", count })).toMatch(
        /nombre de manches/,
      );
    }
  });
});

describe("withStageSettings", () => {
  it("renames and recounts a fixed game, keeping the rest of the rules", () => {
    expect(withStageSettings(LUZ, { label: " Levée ", count: 3 })).toEqual({
      ...LUZ,
      label: "Levée",
      count: 3,
    });
  });

  it("only renames a game whose count it does not own", () => {
    expect(withStageSettings(WINGSPAN, { label: "Saison", count: 9 })).toEqual({
      ...WINGSPAN,
      label: "Saison",
    });
    expect(withStageSettings(ODIN, { label: "Main", count: 9 })).toEqual({
      ...ODIN,
      label: "Main",
    });
  });
});
