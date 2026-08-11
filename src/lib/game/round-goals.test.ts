import { describe, expect, it } from "vitest";

import type { RoundGoal } from "@/lib/domain";

import {
  formatGoalLabel,
  goalCatalogue,
  goalGroups,
  goalTemplateLabel,
  isGoalComplete,
} from "./round-goals";

const eggsInHabitat: RoundGoal = {
  key: "eggsInHabitat",
  label: "Œufs dans {habitat}",
  params: [
    {
      key: "habitat",
      label: "Écosystème",
      options: [
        { value: "forest", label: "Forêt", icon: "habitat-forest" },
        { value: "sea", label: "Mer", icon: "habitat-sea" },
      ],
    },
  ],
};

const totalBirds: RoundGoal = {
  key: "totalBirds",
  label: "Oiseaux (total)",
  params: [],
};

const noGoal: RoundGoal = {
  key: "noGoal",
  label: "Pas d'objectif",
  params: [],
  scores: false,
  extraTurn: 1,
};

describe("goalTemplateLabel", () => {
  it("punches out every variable part", () => {
    expect(goalTemplateLabel(eggsInHabitat)).toBe("Œufs dans X");
  });

  it("leaves a one-off goal untouched", () => {
    expect(goalTemplateLabel(totalBirds)).toBe("Oiseaux (total)");
  });

  it("punches out each of several parts", () => {
    const twoParams: RoundGoal = {
      ...eggsInHabitat,
      label: "{habitat} et {nest}",
    };

    expect(goalTemplateLabel(twoParams)).toBe("X et X");
  });
});

describe("formatGoalLabel", () => {
  it("reads the chosen option's label", () => {
    expect(formatGoalLabel(eggsInHabitat, { habitat: "sea" })).toBe(
      "Œufs dans Mer",
    );
  });

  it("keeps the hole while the value is missing", () => {
    expect(formatGoalLabel(eggsInHabitat, {})).toBe("Œufs dans X");
  });

  it("keeps the hole on a value the catalogue doesn't offer", () => {
    expect(formatGoalLabel(eggsInHabitat, { habitat: "desert" })).toBe(
      "Œufs dans X",
    );
  });

  it("keeps the hole when no parameter declares that key", () => {
    const orphan: RoundGoal = { ...totalBirds, label: "Œufs dans {habitat}" };

    expect(formatGoalLabel(orphan, { habitat: "sea" })).toBe("Œufs dans X");
  });

  it("leaves a one-off goal untouched", () => {
    expect(formatGoalLabel(totalBirds, {})).toBe("Oiseaux (total)");
  });
});

describe("isGoalComplete", () => {
  it("is true once every parameter has a known value", () => {
    expect(isGoalComplete(eggsInHabitat, { habitat: "forest" })).toBe(true);
  });

  it("is false while a value is missing", () => {
    expect(isGoalComplete(eggsInHabitat, {})).toBe(false);
  });

  it("is false on a value outside the options", () => {
    expect(isGoalComplete(eggsInHabitat, { habitat: "desert" })).toBe(false);
  });

  it("is true for a goal without parameters", () => {
    expect(isGoalComplete(totalBirds, {})).toBe(true);
  });
});

describe("goalCatalogue", () => {
  it("appends the extensions' tiles after the base ones", () => {
    const catalogue = goalCatalogue([totalBirds], [[noGoal]]);

    expect(catalogue.map(g => g.key)).toEqual(["totalBirds", "noGoal"]);
  });

  it("keeps the base wording when an extension reuses a key", () => {
    const shadow: RoundGoal = { ...totalBirds, label: "Autre libellé" };
    const catalogue = goalCatalogue([totalBirds], [[shadow]]);

    expect(catalogue).toHaveLength(1);
    expect(catalogue[0].label).toBe("Oiseaux (total)");
  });

  it("keeps the first extension's tile when two declare the same key", () => {
    const other: RoundGoal = { ...noGoal, label: "Autre libellé" };
    const catalogue = goalCatalogue([], [[noGoal], [other]]);

    expect(catalogue).toHaveLength(1);
    expect(catalogue[0].label).toBe("Pas d'objectif");
  });

  it("is just the base game's tiles without extensions", () => {
    expect(goalCatalogue([eggsInHabitat], [])).toEqual([eggsInHabitat]);
  });
});

describe("goalGroups", () => {
  it("sorts the tiles into those that read as they are and those to fill in", () => {
    const groups = goalGroups([eggsInHabitat, totalBirds, noGoal]);

    expect(groups.map(g => g.label)).toEqual([
      "Objectifs uniques",
      "À préciser",
    ]);
    expect(groups[0].goals.map(g => g.key)).toEqual(["totalBirds", "noGoal"]);
    expect(groups[1].goals.map(g => g.key)).toEqual(["eggsInHabitat"]);
  });

  it("drops a heading no tile falls under", () => {
    const groups = goalGroups([eggsInHabitat]);

    expect(groups.map(g => g.label)).toEqual(["À préciser"]);
  });

  it("has nothing to show for an empty catalogue", () => {
    expect(goalGroups([])).toEqual([]);
  });
});
