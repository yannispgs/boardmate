import type {
  Extension,
  ExtensionScenarioId,
  FieldSpec,
  ScoringSpec,
} from "@/lib/domain";

/** Extensions in application order (by `sortOrder`, stable on ties). */
function ordered(exts: Extension[]): Extension[] {
  return [...exts].sort((a, b) => a.sortOrder - b.sortOrder);
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
