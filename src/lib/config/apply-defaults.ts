import type { ConfigValues, FieldSpec } from "@/lib/domain";

/**
 * Returns a copy of `field` with its `default` set from `value`, respecting the
 * field's type — a value whose type doesn't match the field drops the default.
 * Only scalar leaf fields carry a default; object/array fields are returned
 * unchanged (they have no top-level default).
 */
export function withFieldDefault(field: FieldSpec, value: unknown): FieldSpec {
  switch (field.type) {
    case "integer":
    case "number":
      return {
        ...field,
        default: typeof value === "number" ? value : undefined,
      };
    case "text":
      return {
        ...field,
        default: typeof value === "string" ? value : undefined,
      };
    case "enum":
      return {
        ...field,
        default: typeof value === "string" ? value : undefined,
      };
    case "boolean":
      return {
        ...field,
        default: typeof value === "boolean" ? value : undefined,
      };
    default:
      return field;
  }
}

/**
 * Rewrites each field's `default` from `defaults` (keyed by field key). Fields
 * whose key is absent from `defaults` are left untouched, so a partial map only
 * changes the fields it mentions.
 */
export function applyDefaults(
  fields: FieldSpec[],
  defaults: ConfigValues,
): FieldSpec[] {
  return fields.map(field =>
    field.key in defaults
      ? withFieldDefault(field, defaults[field.key])
      : field,
  );
}
