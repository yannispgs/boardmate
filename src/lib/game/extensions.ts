import type {
  Extension,
  ExtensionScenarioId,
  FieldSpec,
  ScoringSpec,
} from "@/lib/domain";

/** `2 scénarios` / `1 scénario` — French plural on the noun only. */
function count(n: number, noun: string): string {
  return `${n} ${noun}${n > 1 ? "s" : ""}`;
}

/** Extensions in application order (by `sortOrder`, stable on ties). */
function ordered(exts: Extension[]): Extension[] {
  return [...exts].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * What an extension concretely changes in the app, as short French labels — the
 * same facts the composition functions below act on, said out loud for the
 * browse screen. Empty when the extension only exists to be recorded on a game.
 */
export function extensionEffects(ext: Extension): string[] {
  const effects: string[] = [];

  if (ext.hasScenarios) {
    effects.push(`${count(ext.scenarios.length, "scénario")} au choix`);
  }

  if (ext.changesBoard) {
    effects.push("Modifie le plateau");
  }

  if (ext.targetModifier > 0) {
    effects.push(`+${ext.targetModifier} points pour gagner`);
  }

  const categories = ext.scoringDelta?.appendSheet?.length ?? 0;

  if (categories > 0) {
    effects.push(`${count(categories, "catégorie")} de score en plus`);
  }

  if (ext.configFields.length > 0) {
    effects.push(`${count(ext.configFields.length, "réglage")} de partie`);
  }

  return effects;
}

/**
 * Merges each active extension's `configFields` onto the base config template
 * **by key** — an extension field replaces the base field of the same key (e.g.
 * a raised default), or is appended when new. Later extensions (higher
 * `sortOrder`) win. Base field order is preserved.
 */
export function composeConfigFields(
  base: FieldSpec[],
  exts: Extension[],
): FieldSpec[] {
  const byKey = new Map<string, FieldSpec>(base.map(f => [f.key, f]));

  for (const ext of ordered(exts)) {
    for (const field of ext.configFields) {
      byKey.set(field.key, field);
    }
  }

  return [...byKey.values()];
}

/**
 * Appends each active extension's scoresheet additions to the base scoresheet.
 * Only categories are added, and only to a game that already keeps a sheet — an
 * extension can't turn an unscored/total game into a category-scored one here.
 */
export function composeScoring(
  base: ScoringSpec | null,
  exts: Extension[],
): ScoringSpec | null {
  if (base === null) {
    return null;
  }

  const additions = ordered(exts).flatMap(
    e => e.scoringDelta?.appendSheet ?? [],
  );

  if (base.sheet === undefined || additions.length === 0) {
    return base;
  }

  return { ...base, sheet: [...base.sheet, ...additions] };
}

/**
 * The base score to reach imposed by a selected scenario (Marins), or null when
 * no scenario is active. The scenario's target **replaces** the base game's
 * configurable target.
 */
export function scenarioTarget(
  exts: Extension[],
  scenarioByExtension: Record<string, ExtensionScenarioId | undefined>,
): number | null {
  for (const ext of ordered(exts)) {
    const scenarioId = scenarioByExtension[ext.id];

    if (scenarioId === undefined) {
      continue;
    }

    const scenario = ext.scenarios.find(s => s.id === scenarioId);

    if (scenario && scenario.targetScore !== null) {
      return scenario.targetScore;
    }
  }

  return null;
}

/**
 * Raises a base win target by the active extensions' modifiers. Modifiers are
 * only ever additive (an extension may make the game harder to win, never
 * easier), so negative modifiers are ignored. Null base stays null.
 */
export function winTargetWithModifiers(
  base: number | null,
  exts: Extension[],
): number | null {
  if (base === null) {
    return null;
  }

  const bonus = exts.reduce((sum, e) => sum + Math.max(0, e.targetModifier), 0);

  return base + bonus;
}
