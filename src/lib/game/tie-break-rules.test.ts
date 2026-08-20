import { describe, expect, it } from "vitest";

import type { TieBreakRule } from "@/lib/domain";

import { cleanTieBreakRules, newTieBreakRule } from "./tie-break-rules";

const ask = (over: Partial<TieBreakRule> = {}): TieBreakRule => ({
  key: "k1",
  label: "Le plus de jetons nature",
  direction: "highest",
  source: "ask",
  ...over,
});

describe("newTieBreakRule", () => {
  it("starts unnamed, on a value the table gives", () => {
    const rule = newTieBreakRule();

    expect(rule.label).toBe("");
    expect(rule.source).toBe("ask");
    expect(rule.direction).toBe("highest");
    expect(rule.key).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("cleanTieBreakRules", () => {
  it("trims the label and the hint", () => {
    const rules = cleanTieBreakRules([
      ask({ label: "  Le plus de nourriture  ", help: "  Jetons restants  " }),
    ]);

    expect(rules).toEqual([
      {
        key: "k1",
        label: "Le plus de nourriture",
        direction: "highest",
        source: "ask",
        help: "Jetons restants",
      },
    ]);
  });

  it("drops a rule left unnamed", () => {
    expect(cleanTieBreakRules([ask({ label: "   " })])).toEqual([]);
  });

  it("leaves out a hint nobody typed", () => {
    const rules = cleanTieBreakRules([ask({ help: "   " })]);

    expect(rules[0]).not.toHaveProperty("help");
  });

  it("leaves out a hint that was never set at all", () => {
    const rules = cleanTieBreakRules([ask()]);

    expect(rules[0]).not.toHaveProperty("help");
  });

  it("ranks on the highest value when no direction was chosen", () => {
    const rules = cleanTieBreakRules([ask({ direction: undefined })]);

    expect(rules[0].direction).toBe("highest");
  });

  it("keeps a rule that ranks on the lowest value", () => {
    const rules = cleanTieBreakRules([
      ask({ label: "Le moins de cartes révélées", direction: "lowest" }),
    ]);

    expect(rules[0].direction).toBe("lowest");
  });

  it("asks nothing for a rule the app already knows, and favours the turn holder", () => {
    const rules = cleanTieBreakRules([
      ask({
        label: "Celui dont c'est le tour",
        source: "currentTurn",
        direction: "lowest",
        help: "Sans objet",
      }),
    ]);

    expect(rules).toEqual([
      {
        key: "k1",
        label: "Celui dont c'est le tour",
        direction: "highest",
        source: "currentTurn",
      },
    ]);
  });

  it("keeps the order, which is the order the rules are applied in", () => {
    const rules = cleanTieBreakRules([
      ask({ key: "a", label: "Premier" }),
      ask({ key: "b", label: "  " }),
      ask({ key: "c", label: "Second" }),
    ]);

    expect(rules.map(r => r.key)).toEqual(["a", "c"]);
  });
});
