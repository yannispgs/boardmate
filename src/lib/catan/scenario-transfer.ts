/**
 * Carrying a scenario out of the app, and back in.
 *
 * Scenarios live nowhere but the database — nothing is shipped in the code any
 * more — so a map that took an evening to transcribe has no copy anywhere, and
 * moving one from one environment to another means going through the database
 * by hand. Written out as text, a scenario can be kept, sent, pasted back, and
 * pasted twice to make a variant of itself.
 *
 * A pasted scenario is untrusted input like any other: it goes through the same
 * schema the database blobs go through, and is refused rather than half-read.
 */

import { scenarioSpecSchema } from "./scenario-schema";
import type { ScenarioSpec } from "./scenario-spec";

/** Why a pasted scenario was refused. The wording of it belongs to the screen. */
export type ImportRefusal = "empty" | "not-json" | "not-a-scenario";

export type ScenarioImport =
  | { ok: true; spec: ScenarioSpec }
  | { ok: false; refusal: ImportRefusal };

/**
 * A scenario's plan as plain text: the whole spec the editor writes, indented
 * so a human can read what he is about to paste somewhere.
 */
export function serialiseScenario(spec: ScenarioSpec): string {
  return JSON.stringify(spec, null, 2);
}

/**
 * Reads back what {@link serialiseScenario} wrote — or anything else that was
 * pasted into the box, which is why the shape is checked before the spec is
 * handed on. Game rules aren't checked here: an imported map that doesn't add
 * up opens in the editor with its problems listed, like any other.
 */
export function parseScenarioText(text: string): ScenarioImport {
  if (text.trim() === "") {
    return { ok: false, refusal: "empty" };
  }

  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, refusal: "not-json" };
  }

  const parsed = scenarioSpecSchema.safeParse(value);

  return parsed.success
    ? { ok: true, spec: parsed.data }
    : { ok: false, refusal: "not-a-scenario" };
}

/**
 * A name no scenario of the extension holds yet. Importing the same scenario
 * twice is how a variant of it is started, so the second one is named « …
 * (copie) » instead of silently becoming a twin of the first in every list.
 */
export function freeName(wanted: string, taken: string[]): string {
  const copyOf = (n: number) =>
    n === 1 ? `${wanted} (copie)` : `${wanted} (copie ${n})`;

  if (!taken.includes(wanted)) {
    return wanted;
  }

  let n = 1;

  while (taken.includes(copyOf(n))) {
    n += 1;
  }

  return copyOf(n);
}
