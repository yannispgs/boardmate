import { describe, expect, it } from "vitest";
import { PHASE_COLORS, phaseColorOf } from "./phase-colors";

const PHASES = [
  { key: "discovery" },
  { key: "projects" },
  { key: "production" },
];

describe("phaseColorOf", () => {
  it("gives each phase the colour of its rank in the list", () => {
    expect(phaseColorOf(PHASES, "discovery")).toBe(PHASE_COLORS[0]);
    expect(phaseColorOf(PHASES, "projects")).toBe(PHASE_COLORS[1]);
    expect(phaseColorOf(PHASES, "production")).toBe(PHASE_COLORS[2]);
  });

  it("cycles once a game declares more phases than there are colours", () => {
    const many = PHASE_COLORS.map((_, i) => ({ key: `p${i}` })).concat({
      key: "extra",
    });

    expect(phaseColorOf(many, "extra")).toBe(PHASE_COLORS[0]);
  });

  it("falls back to the first colour for a phase absent from the list", () => {
    expect(phaseColorOf(PHASES, "unknown")).toBe(PHASE_COLORS[0]);
  });
});
