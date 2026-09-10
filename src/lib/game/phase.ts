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
  NextPhase,
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
 * The phase that follows the one at `index`, or `null` when nothing does — the
 * stage itself ends there, and only the caller knows what to call the next one.
 */
export function nextPhase(
  phases: PhaseSpec[] | null,
  index: number,
): PhaseSpec | null {
  const next = advancePhase(phases, index);

  if (!phases || next.stageEnds) {
    return null;
  }

  return currentPhase(phases, next.index);
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
 * Which way the cards actually go on the table right now — the direction to put
 * on screen, or null when there is nothing to say.
 *
 * Three things have to hold before the table is told anything: the game is in a
 * phase at all, it is being played with the drafted draw, and the phase in
 * question is the drafted one. {@link draftDirection} already answers the last,
 * so this only adds the two the screen would otherwise have had to remember.
 */
export function playedDraft(
  phase: PhaseSpec | null,
  drafting: boolean,
  stage: number,
): DraftDirection | null {
  if (phase === null || !drafting) {
    return null;
  }

  return draftDirection(phase, stage);
}

/**
 * Whether this game is being played with the drafted draw.
 *
 * The draft is a variant, so the answer comes from the game's own configuration
 * — the value chosen at launch, else the config template's default. A game
 * launched before the field existed reads as « not drafted », which is the
 * honest answer: nobody ticked anything.
 *
 * Read from the first phase that declares a draft. A boardgame switches its
 * draw to a draft once, for the whole game; the phases don't each get their own
 * variant to turn on.
 */
export function draftingOn(
  phases: PhaseSpec[] | null,
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
): boolean {
  const drafted = phases?.find(phase => phase.draft)?.draft;

  if (!drafted) {
    return false;
  }

  return resolveFlag(drafted.configKey, configValues, templateFields, false);
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
