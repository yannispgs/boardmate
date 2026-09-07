/**
 * A game's configuration read back as plain sentences, for a screen that shows
 * what is set rather than letting it be set.
 *
 * The forms already render a template's fields as inputs ({@link ConfigField}).
 * This is the other direction: the values as they will be carried, so a table
 * can check them before agreeing to play another party on them.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { ConfigValues, FieldSpec } from "@/lib/domain";

/** One attribute of the configuration, ready to print. */
export interface ConfigRecapLine {
  key: string;
  label: string;
  /** The value as it reads to a player, never a raw stored one. */
  value: string;
}

/**
 * The configuration as a list of « attribute → value » lines, in the template's
 * own field order.
 *
 * ⚠️ Built from the **stored values**, not from the template's defaults. A party
 * launched from the funnel can tweak an attribute for that party alone, over and
 * above the named configuration it started from — so a party can read
 * « Configuration par défaut » while carrying values that are nothing of the
 * sort. Printing the defaults here would make the recap agree with the label and
 * disagree with the party, which is the one failure a recap must not have.
 *
 * An attribute the party carries no value for is **left out** rather than shown
 * empty: this list answers « what comes along », and a field with nothing stored
 * brings nothing along. The `object` and `array` field types are left out for
 * the same reason at one remove — they are declared for later and no screen sets
 * them, so any rendering here would be a guess at a shape nobody has authored
 * yet.
 */
export function configRecap(
  fields: readonly FieldSpec[],
  values: ConfigValues | null,
): ConfigRecapLine[] {
  if (values === null) {
    return [];
  }

  const lines: ConfigRecapLine[] = [];

  for (const field of fields) {
    const printed = printable(field, values[field.key]);

    if (printed !== null) {
      lines.push({ key: field.key, label: field.label, value: printed });
    }
  }

  return lines;
}

/**
 * One value as a player reads it, or `null` when there is nothing to read.
 *
 * A boolean is the interesting case: `false` is a real answer — « Maître du port
 * non » is something the table agreed to — so it prints, where a missing value
 * does not. The two are the same falsy thing in JavaScript and opposite things
 * at the table.
 */
function printable(field: FieldSpec, value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (field.type === "boolean") {
    return value === true ? "Oui" : "Non";
  }

  if (field.type === "enum") {
    const chosen = field.options.find(option => {
      return option.value === value;
    });

    if (chosen !== undefined) {
      return chosen.label;
    }

    // An option that left the template after a party was played on it: the
    // stored value is still what that party used, so it prints as itself rather
    // than vanishing from a recap that claims to be complete. Only where it
    // reads as something, though — a stored object has no reading, and printing
    // « [object Object] » against an attribute is worse than not printing it.
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : null;
  }

  if (field.type === "integer" || field.type === "number") {
    return typeof value === "number" ? String(value) : null;
  }

  if (field.type === "text") {
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  return null;
}
