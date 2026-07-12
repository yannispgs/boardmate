/**
 * Helpers for editing a config template's field *definitions* (the schema of
 * tunable parameters a game exposes), as opposed to their default values.
 *
 * The editor UI (and {@link ConfigField}) support the scalar leaf types only;
 * object/array remain declared-but-not-editable, so this module works over the
 * scalar subset.
 */

import type { FieldSpec } from "@/lib/domain";

/** The field types the template editor can add (scalar leaves). */
export type ScalarFieldType =
  | "integer"
  | "number"
  | "text"
  | "boolean"
  | "enum";

/** The config keys the turn-time schedule ("moniteur") reads. */
export const MONITOR_KEYS = {
  base: "turnBaseS",
  step: "turnStepS",
  max: "turnMaxS",
} as const;

/**
 * The three timer fields, ready to drop in as a "moniteur" preset so the owner
 * doesn't have to know the magic keys.
 */
export const TIMER_FIELDS: FieldSpec[] = [
  {
    key: MONITOR_KEYS.base,
    label: "Durée de base (s)",
    type: "integer",
    min: 5,
    max: 600,
    default: 45,
  },
  {
    key: MONITOR_KEYS.step,
    label: "Augmentation par tour (s)",
    type: "integer",
    min: 0,
    max: 120,
    default: 0,
  },
  {
    key: MONITOR_KEYS.max,
    label: "Durée max (s)",
    type: "integer",
    min: 5,
    max: 900,
    default: 120,
  },
];

/** A fresh, blank field of the given scalar type (for adding a new row). */
export function blankField(type: ScalarFieldType): FieldSpec {
  switch (type) {
    case "integer":
    case "number":
      return { key: "", label: "", type };
    case "text":
      return { key: "", label: "", type };
    case "boolean":
      return { key: "", label: "", type, default: false };
    case "enum":
      return { key: "", label: "", type, options: [] };
  }
}

/**
 * Cleans an edited field list before saving: trims keys/labels, drops fields
 * with no key or no label, keeps the first of any duplicate keys, and for enum
 * fields trims their options and drops the field if none remain. Non-scalar
 * fields are passed through untouched (they aren't editable here).
 */
export function cleanTemplateFields(fields: FieldSpec[]): FieldSpec[] {
  const clean: FieldSpec[] = [];
  const seen = new Set<string>();

  for (const field of fields) {
    const key = field.key.trim();
    const label = field.label.trim();
    if (key === "" || label === "" || seen.has(key)) {
      continue;
    }

    if (field.type === "enum") {
      const options = field.options
        .map(o => ({ value: o.value.trim(), label: o.label.trim() }))
        .filter(o => o.value !== "" && o.label !== "");
      if (options.length === 0) {
        continue;
      }

      seen.add(key);
      clean.push({ ...field, key, label, options });
      continue;
    }

    seen.add(key);
    clean.push({ ...field, key, label });
  }

  return clean;
}
