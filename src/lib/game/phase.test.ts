import { describe, expect, it } from "vitest";

import type { FieldSpec, PhaseSpec } from "@/lib/domain";
import {
  advancePhase,
  clampIndex,
  currentPhase,
  DRAFT_LABEL,
  draftDirection,
  draftingOn,
  needsPhaseButton,
  nextPhase,
  turnTimerApplies,
} from "./phase";

/** Terraforming Mars' generation, as the migration seeds it. */
const TM: PhaseSpec[] = [
  {
    key: "discovery",
    label: "Découverte",
    mode: "simultaneous",
    clock: "stopwatch",
    draft: { configKey: "draft", oddStage: "right" },
  },
  {
    key: "projects",
    label: "Réalisation des projets",
    mode: "sequential",
    clock: "turnTimer",
  },
  {
    key: "production",
    label: "Production des ressources",
    mode: "simultaneous",
    clock: "stopwatch",
  },
];

const DRAFT_FIELD: FieldSpec[] = [
  { key: "draft", type: "boolean", label: "Pioche en mode draft" },
];

describe("currentPhase", () => {
  it("reads the phase at the index", () => {
    expect(currentPhase(TM, 1)?.key).toBe("projects");
  });

  it("has no phase for a game that declares none", () => {
    expect(currentPhase(null, 0)).toBeNull();
    expect(currentPhase([], 0)).toBeNull();
  });

  it("survives an index the data no longer has", () => {
    // A phase dropped from the list must not leave a live game pointing at
    // nothing: it lands on the last one instead.
    expect(currentPhase(TM, 9)?.key).toBe("production");
    expect(currentPhase(TM, -3)?.key).toBe("discovery");
  });
});

describe("clampIndex", () => {
  it("keeps an index inside the list", () => {
    expect(clampIndex(TM, 1)).toBe(1);
    expect(clampIndex(TM, 42)).toBe(2);
    expect(clampIndex(TM, -1)).toBe(0);
    expect(clampIndex(TM, 1.7)).toBe(1);
  });
});

describe("advancePhase", () => {
  it("moves to the next phase without closing the stage", () => {
    expect(advancePhase(TM, 0)).toEqual({ index: 1, stageEnds: false });
    expect(advancePhase(TM, 1)).toEqual({ index: 2, stageEnds: false });
  });

  it("closes the stage when the last phase ends", () => {
    // Running out of phases IS the generation ending — the caller is told so
    // rather than having to compare indices itself.
    expect(advancePhase(TM, 2)).toEqual({ index: 0, stageEnds: true });
  });

  it("stays put for a game that declares no phases", () => {
    expect(advancePhase(null, 0)).toEqual({ index: 0, stageEnds: false });
    expect(advancePhase([], 3)).toEqual({ index: 0, stageEnds: false });
  });

  it("recovers from an index past the end of the list", () => {
    expect(advancePhase(TM, 9)).toEqual({ index: 0, stageEnds: true });
  });
});

describe("draftDirection", () => {
  it("alternates from one stage to the next", () => {
    // The owner's rule: odd stage right, even stage left.
    expect(draftDirection(TM[0], 1)).toBe("right");
    expect(draftDirection(TM[0], 2)).toBe("left");
    expect(draftDirection(TM[0], 3)).toBe("right");
    expect(draftDirection(TM[0], 4)).toBe("left");
  });

  it("alternates the other way when the game starts left", () => {
    const left: PhaseSpec = {
      ...TM[0],
      draft: { configKey: "draft", oddStage: "left" },
    };

    expect(draftDirection(left, 1)).toBe("left");
    expect(draftDirection(left, 2)).toBe("right");
  });

  it("says nothing about a phase that is never drafted", () => {
    expect(draftDirection(TM[1], 1)).toBeNull();
  });
});

describe("draftingOn", () => {
  it("reads the variant off the game's configuration", () => {
    expect(draftingOn(TM, { draft: true }, DRAFT_FIELD)).toBe(true);
    expect(draftingOn(TM, { draft: false }, DRAFT_FIELD)).toBe(false);
  });

  it("says no for a game launched before the field existed", () => {
    // No value and no default: nobody ticked anything, so there is no draft.
    expect(draftingOn(TM, null, [])).toBe(false);
    expect(draftingOn(TM, {}, [])).toBe(false);
  });

  it("falls back to the template default", () => {
    const on: FieldSpec[] = [
      { key: "draft", type: "boolean", label: "Draft", default: true },
    ];

    expect(draftingOn(TM, null, on)).toBe(true);
  });

  it("says no when nothing in the game can be drafted at all", () => {
    expect(draftingOn(null, { draft: true }, DRAFT_FIELD)).toBe(false);
    expect(draftingOn([TM[1]], { draft: true }, DRAFT_FIELD)).toBe(false);
  });
});

describe("nextPhase", () => {
  it("names what the current phase gives way to", () => {
    expect(nextPhase(TM, 0)?.key).toBe("projects");
    expect(nextPhase(TM, 1)?.key).toBe("production");
  });

  it("names nothing when the stage itself ends there", () => {
    // Past the last phase there is a new generation, not a new phase — and only
    // the caller knows what that generation is called.
    expect(nextPhase(TM, 2)).toBeNull();
    expect(nextPhase(null, 0)).toBeNull();
  });
});

describe("DRAFT_LABEL", () => {
  it("says each direction the way the table would", () => {
    expect(DRAFT_LABEL.left).toBe("à gauche");
    expect(DRAFT_LABEL.right).toBe("à droite");
  });
});

describe("turnTimerApplies", () => {
  it("runs the countdown only on the phase that asks for it", () => {
    expect(turnTimerApplies(TM[0])).toBe(false);
    expect(turnTimerApplies(TM[1])).toBe(true);
    expect(turnTimerApplies(TM[2])).toBe(false);
  });

  it("leaves a game without phases exactly as it was", () => {
    expect(turnTimerApplies(null)).toBe(true);
  });
});

describe("needsPhaseButton", () => {
  it("gives the table a button on a phase with no turns", () => {
    expect(needsPhaseButton(TM[0])).toBe(true);
    expect(needsPhaseButton(TM[2])).toBe(true);
  });

  it("leaves a sequential phase to advance on its turns", () => {
    expect(needsPhaseButton(TM[1])).toBe(false);
    expect(needsPhaseButton(null)).toBe(false);
  });
});
