import type {
  Extension,
  ExtensionScenarioId,
  FieldSpec,
  PlayedExtension,
  RoundGoal,
  ScoringSpec,
} from "@/lib/domain";

import { goalCatalogue } from "./round-goals";

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
 * How an extension reads where the base game is already named: « Catan -
 * Marins » under a card headed « Catan » says Catan twice. The prefix is only
 * dropped when the name actually carries it, so an extension named on its own
 * (« Villes & Chevaliers ») is left exactly as it was written.
 */
export function extensionShortName(name: string, baseName: string): string {
  const prefix = `${baseName} - `;

  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

/**
 * Puts what a game was played with in the order the extensions apply — the same
 * order they composed in, so a game reads the way it was built. Kept here rather
 * than in the adapter: it is the one rule, and the games list reaches it from
 * rows that never carry a whole `Extension`.
 */
export function orderPlayed(
  items: Array<PlayedExtension & { sortOrder: number }>,
): PlayedExtension[] {
  return [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ name, scenarioName }) => ({ name, scenarioName }));
}

/**
 * The extensions a game was played with, reduced to what is worth showing next
 * to it afterwards: the extension, and the scenario played when it has any.
 * Everything else was folded into the game at launch — the config it merged,
 * the score categories it added — and reads there, not here.
 */
export function playedExtensions(
  exts: Array<Extension & { scenarioId: ExtensionScenarioId | null }>,
): PlayedExtension[] {
  return orderPlayed(
    exts.map(e => ({
      name: e.name,
      scenarioName: e.scenarios.find(s => s.id === e.scenarioId)?.name ?? null,
      sortOrder: e.sortOrder,
    })),
  );
}

/**
 * What a party was played with, as one comparable handle: the extensions in
 * application order, **scenario aside**. Empty string for the base game — a
 * basket of its own, not a missing value, since a score made with an extension
 * does not compare to one made without it (Marins adds points to the board,
 * Océanie moves the nectar).
 *
 * Deliberately coarser than `setupKey`, which a speed record compares on: there
 * the scenario decides the map and so belongs in the handle, while here it
 * splits the lines of a cell rather than the baskets.
 */
export function extensionTab(extensions: readonly PlayedExtension[]): string {
  return extensions.map(e => e.name).join(" + ");
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
 * The end-of-stage goal tiles a game can be set up with: the base game's, plus
 * the ones each active extension brings (Oceania's six). See
 * {@link goalCatalogue} for what happens to a key an extension re-declares.
 */
export function composeGoals(
  base: RoundGoal[],
  exts: Extension[],
): RoundGoal[] {
  return goalCatalogue(
    base,
    ordered(exts).map(e => e.roundGoals),
  );
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
