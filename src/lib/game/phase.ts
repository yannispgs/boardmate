/**
 * Where a game stands inside its stage, and what that phase is timed with.
 *
 * Everything here reads the boardgame's declared phases; nothing is keyed on a
 * game's name. A game that declares none behaves exactly as it always has —
 * that is what makes this safe to add to every game at once.
 *
 * Pure: no vendor types, unit-tested.
 */

import type {
  ConfigValues,
  DraftDirection,
  FieldSpec,
  PhaseSpec,
} from "@/lib/domain";
import { resolveFlag } from "./config-value";

/** The phase a game is currently in, or `null` when it declares none. */
export function currentPhase(
  phases: PhaseSpec[] | null,
  index: number,
): PhaseSpec | null {
  if (!phases || phases.length === 0) {
    return null;
  }

  /* c8 ignore next -- `clampIndex` has already put the index inside the list,
     so the `?? null` only answers the index signature, never a real miss. */
  return phases[clampIndex(phases, index)] ?? null;
}

/** Keeps a stored index inside the list, however the data has since changed. */
export function clampIndex(phases: PhaseSpec[], index: number): number {
  return Math.min(Math.max(0, Math.trunc(index)), phases.length - 1);
}

/** Where a game lands when the current phase is declared finished. */
export interface NextPhase {
  /** The phase index to move to. */
  index: number;
  /**
   * Whether the stage itself is over — the last phase has just closed, so the
   * table rolls into the next generation and the list starts again.
   */
  stageEnds: boolean;
}

/**
 * Advances past the current phase. Wrapping is what closes a stage: the phases
 * are the stage, so running out of them and the generation ending are the same
 * event, and the caller is told rather than left to compare indices.
 */
export function advancePhase(
  phases: PhaseSpec[] | null,
  index: number,
): NextPhase {
  if (!phases || phases.length === 0) {
    return { index: 0, stageEnds: false };
  }

  const next = clampIndex(phases, index) + 1;

  return next >= phases.length
    ? { index: 0, stageEnds: true }
    : { index: next, stageEnds: false };
}

/**
 * Which way the cards go on a given stage, when the phase is drafted.
 *
 * The rule (owner, 2026-08-18) is that the direction **alternates**: an odd
 * stage goes one way, an even stage the other. The phase carries the direction
 * of the odd stage and the parity settles the rest, so nothing has to be
 * written down generation by generation — and the table stops arguing about it
 * from the third one onwards.
 */
export function draftDirection(
  phase: PhaseSpec,
  stage: number,
): DraftDirection | null {
  if (!phase.draft) {
    return null;
  }

  const odd = Math.trunc(stage) % 2 !== 0;
  const { oddStage } = phase.draft;

  if (odd) {
    return oddStage;
  }

  return oddStage === "left" ? "right" : "left";
}

/**
 * The direction to announce for a phase, or `null` when there is nothing to
 * announce: the phase is never drafted, or this game was configured without the
 * variant. A game launched before the field existed reads as « not drafted »,
 * which is the honest answer — nobody ticked anything.
 */
export function draftNotice(
  phase: PhaseSpec | null,
  stage: number,
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
): DraftDirection | null {
  if (!phase?.draft) {
    return null;
  }

  const on = resolveFlag(
    phase.draft.configKey,
    configValues,
    templateFields,
    false,
  );

  return on ? draftDirection(phase, stage) : null;
}

/** How a direction is said in the interface. */
export const DRAFT_LABEL: Readonly<Record<DraftDirection, string>> = {
  left: "à gauche",
  right: "à droite",
};

/**
 * Whether the per-player countdown applies right now. A game with no phases at
 * all keeps its timer, which is every game the app runs today; a game with
 * phases only runs it on the phase that declares it.
 */
export function turnTimerApplies(phase: PhaseSpec | null): boolean {
  return phase === null || phase.clock === "turnTimer";
}

/**
 * Whether the table advances this phase itself. A simultaneous phase has no
 * « next turn » to press, so without a button of its own the clock would run
 * until somebody happened to think of it.
 */
export function needsPhaseButton(phase: PhaseSpec | null): boolean {
  return phase !== null && phase.mode === "simultaneous";
}
