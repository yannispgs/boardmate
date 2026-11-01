import type { StageSpec } from "@/lib/domain";

/**
 * The two things about a game's manches a table may set from the game's
 * settings: what one is called (« Donne », « Génération ») and, when the rules
 * fix it, how many the game lasts.
 *
 * Everything else in a {@link StageSpec} — how a manche closes, its calendar,
 * its ladder, its bet — is the rulebook's, written by migration. So the edits
 * are laid over the spec as it is NOW, never rebuilt from a form, which would
 * drop whatever the form does not show.
 */

/** The longest a manche's name may be — it heads a counter, « Donne 3 / 4 ». */
export const STAGE_LABEL_MAX = 20;

/** The most manches a game may be fixed to last. */
export const STAGE_COUNT_MAX = 20;

/**
 * How a game's number of manches is known:
 * - `fixed`: the rules set it and the table may change it (Luz: 4);
 * - `schedule`: it is the length of the calendar, each manche its own number
 *   of laps (Wingspan: 4) — read-only, the calendar is the rulebook's;
 * - `open`: nobody knows it before the game ends (Odin, Terraforming Mars).
 */
export type StageCountKind = "fixed" | "schedule" | "open";

export function stageCountKind(stages: StageSpec): StageCountKind {
  if (stages.count !== undefined) {
    return "fixed";
  }

  return stages.advance === "schedule" && stages.schedule !== undefined
    ? "schedule"
    : "open";
}

export interface StageSettings {
  label: string;
  /** Ignored unless the count is {@link StageCountKind} `fixed`. */
  count: number;
}

/** Why the settings cannot be saved, in the table's words — or `null`. */
export function stageSettingsError(settings: StageSettings): string | null {
  const label = settings.label.trim();

  if (label === "") {
    return "Donne un nom à la manche.";
  }

  if (label.length > STAGE_LABEL_MAX) {
    return `Le nom tient en ${STAGE_LABEL_MAX} caractères au plus.`;
  }

  if (
    !Number.isInteger(settings.count) ||
    settings.count < 1 ||
    settings.count > STAGE_COUNT_MAX
  ) {
    return `Le nombre de manches va de 1 à ${STAGE_COUNT_MAX}.`;
  }

  return null;
}

/** The spec with the new name — and the new count, where the table owns it. */
export function withStageSettings(
  stages: StageSpec,
  settings: StageSettings,
): StageSpec {
  const label = settings.label.trim();

  return stageCountKind(stages) === "fixed"
    ? { ...stages, label, count: settings.count }
    : { ...stages, label };
}
