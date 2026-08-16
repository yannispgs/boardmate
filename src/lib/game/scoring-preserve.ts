/**
 * Keeping the parts of a scoring spec the boardgame editor never asks about.
 *
 * The editor rebuilds `scoring` from its own fields on every save. Anything it
 * doesn't have a field for is therefore dropped — silently, and only noticed
 * games later when a rule stops applying. Catan's `startScore` / `minScore` of
 * 2, the per-game `tieBreak` rules and Papayoo's `totalSum` are all authored in
 * migrations and all invisible to the form, so all three used to evaporate the
 * first time somebody re-saved the sheet to fix a typo in the name.
 *
 * Carrying them over is the fix, and it has to be a **deny-list of what the
 * form owns** rather than an allow-list of what to keep: a field added to the
 * spec tomorrow and forgotten here would go back to being erased.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { ScoringSpec } from "@/lib/domain";

/** The spec's keys the boardgame form actually edits, and so may overwrite. */
const EDITED_KEYS = [
  "timing",
  "entry",
  "stopCondition",
  "winCondition",
  "allowNegative",
  "sheet",
] as const satisfies ReadonlyArray<keyof ScoringSpec>;

/**
 * The spec to save: what the form built, plus every field it never asked about,
 * taken from the spec as it stood. `previous` null (a game being created) or
 * `built` null (a game turned unscored) leaves `built` untouched — there is
 * nothing to carry over, or nowhere to carry it to.
 */
export function preserveUneditedScoring(
  built: ScoringSpec | null,
  previous: ScoringSpec | null,
): ScoringSpec | null {
  if (built === null || previous === null) {
    return built;
  }

  const carried: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(previous)) {
    if (!(EDITED_KEYS as readonly string[]).includes(key)) {
      carried[key] = value;
    }
  }

  return { ...carried, ...built };
}
