import { describe, expect, it } from "vitest";

import type { ScoringSpec } from "@/lib/domain";

import { preserveUneditedScoring } from "./scoring-preserve";

/** What the form builds out of its own fields, for a plain scored game. */
const BUILT: ScoringSpec = {
  timing: "final",
  entry: "total",
  stopCondition: null,
  winCondition: { type: "highest" },
  allowNegative: false,
};

describe("preserveUneditedScoring", () => {
  it("carries over the fields the form has no box for", () => {
    const previous: ScoringSpec = {
      ...BUILT,
      startScore: 2,
      minScore: 2,
      totalSum: 250,
      tieBreak: [
        {
          key: "natureTokens",
          label: "Le plus de jetons nature",
          source: "ask",
        },
      ],
    };

    // Re-saving a sheet to fix a typo in the name used to wipe all four.
    expect(preserveUneditedScoring(BUILT, previous)).toEqual(previous);
  });

  it("lets the form overwrite every field it does own", () => {
    const previous: ScoringSpec = {
      timing: "live",
      entry: "categories",
      stopCondition: { type: "scoreTarget", field: "score" },
      winCondition: { type: "lowest" },
      allowNegative: true,
      sheet: [{ key: "birds", label: "Oiseaux" }],
      totalSum: 250,
    };

    expect(preserveUneditedScoring(BUILT, previous)).toEqual({
      ...BUILT,
      totalSum: 250,
    });
  });

  it("drops a sheet the form has just emptied", () => {
    const previous: ScoringSpec = {
      ...BUILT,
      entry: "categories",
      sheet: [{ key: "birds", label: "Oiseaux" }],
    };
    const kept = preserveUneditedScoring(BUILT, previous);

    expect(kept).not.toHaveProperty("sheet");
  });

  it("has nothing to carry over on a game being created", () => {
    expect(preserveUneditedScoring(BUILT, null)).toBe(BUILT);
  });

  it("has nowhere to carry anything on a game turned unscored", () => {
    expect(
      preserveUneditedScoring(null, { ...BUILT, totalSum: 250 }),
    ).toBeNull();
  });
});
