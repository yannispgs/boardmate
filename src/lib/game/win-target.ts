import type {
  BooleanFieldSpec,
  ConfigValues,
  Extension,
  ExtensionScenarioId,
  FieldSpec,
  StopCondition,
} from "@/lib/domain";
import { scenarioTarget, winTargetWithModifiers } from "./extensions";
import { optionTargetModifier } from "./scoring";

/** Everything the recap's target bar reads, already resolved. */
export interface WinTargetBarView {
  /** The target a scenario imposes, or null when the game sets its own. */
  locked: number | null;
  /** Why the target is imposed — only meaningful alongside a locked one. */
  note: string;
  /** The editable base target, empty while the field is being cleared. */
  value: number | "";
  min?: number;
  max?: number;
  /** What the active options add on top of the base, already summed. */
  bonus: { label: string; total: number } | null;
}

export interface WinTargetView {
  /**
   * The config field the stop condition counts against, when there is one. The
   * recap keeps it out of the generic attribute list and edits it through the
   * bar instead, so the number the game aims at has a single home.
   */
  field: string | null;
  /** The bar to show, or null for a game that aims at no target at all. */
  bar: WinTargetBarView | null;
}

/**
 * Resolves the score a game is played to, from the four things that can move
 * it: the game's own stop-condition field, the value set for this game, the
 * options switched on (Catan's « Maître du port » = +1) and the scenario an
 * extension imposes.
 *
 * A scenario's target wins over the editable field and is read-only; options
 * and extension modifiers raise it either way. The field always holds the
 * **base**, never the sum — so the recap can spell the addition out instead of
 * silently rewriting what was typed.
 */
export function winTargetView(
  stopCondition: StopCondition | null,
  fields: FieldSpec[],
  values: ConfigValues | null,
  active: Extension[],
  scenarioByExtension: Record<string, ExtensionScenarioId | undefined>,
): WinTargetView {
  const field = stopCondition?.field ?? null;
  const spec =
    field === null ? null : (fields.find(f => f.key === field) ?? null);

  const optionBonus = optionTargetModifier(values, fields);
  const scenarioBase = scenarioTarget(active, scenarioByExtension);
  const locked = winTargetWithModifiers(
    scenarioBase === null ? null : scenarioBase + optionBonus,
    active,
  );

  if (locked === null && spec === null) {
    return { field, bar: null };
  }

  const raw = field === null ? undefined : values?.[field];
  const value = typeof raw === "number" ? raw : "";

  return {
    field,
    bar: {
      locked,
      note: `Imposé par le scénario${raisedNote(active, optionBonus)}.`,
      value,
      min: spec !== null && "min" in spec ? spec.min : undefined,
      max: spec !== null && "max" in spec ? spec.max : undefined,
      bonus: targetBonus(fields, values, value, optionBonus),
    },
  };
}

/** The parenthetical saying a scenario's imposed target was pushed up. */
function raisedNote(active: Extension[], optionBonus: number): string {
  const bumped = active.some(e => e.targetModifier > 0) || optionBonus > 0;

  return bumped ? " (relevé par les options et extensions actives)" : "";
}

/** Names the options that raise the target, and what they raise it to. */
function targetBonus(
  fields: FieldSpec[],
  values: ConfigValues | null,
  base: number | "",
  optionBonus: number,
): WinTargetBarView["bonus"] {
  if (optionBonus <= 0 || typeof base !== "number") {
    return null;
  }

  const boosted = fields.filter(
    (f): f is BooleanFieldSpec =>
      f.type === "boolean" &&
      (f.targetModifier ?? 0) > 0 &&
      values?.[f.key] === true,
  );

  return {
    label: boosted.map(f => `+${f.targetModifier} ${f.label}`).join(" · "),
    total: base + optionBonus,
  };
}
