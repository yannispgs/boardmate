import { z } from "zod";

import type { ConfigValues, FieldSpec } from "@/lib/domain";

/**
 * Compiles a config template (`FieldSpec[]`) into a Zod schema at runtime, so a
 * config created in-app can never hold invalid values. Fully recursive: object
 * and array fields rebuild schemas from their nested specs.
 */
export function buildConfigSchema(fields: FieldSpec[]): z.ZodObject {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    shape[field.key] = fieldToZod(field);
  }
  return z.object(shape);
}

function fieldToZod(field: FieldSpec): z.ZodType {
  const base = baseFieldToZod(field);
  return field.required === false ? base.optional() : base;
}

/**
 * Applies optional lower/upper bounds. `.min`/`.max` mean value range for
 * numbers, length for strings and item count for arrays — the same two calls
 * across all three, so every bounded field type reuses this instead of
 * repeating the null checks.
 */
function bounded<S extends z.ZodNumber | z.ZodString | z.ZodArray>(
  s: S,
  lo: number | null | undefined,
  hi: number | null | undefined,
): S {
  let r = s;
  if (lo != null) {
    r = r.min(lo) as S;
  }
  if (hi != null) {
    r = r.max(hi) as S;
  }
  return r;
}

function baseFieldToZod(field: FieldSpec): z.ZodType {
  switch (field.type) {
    case "integer":
      return bounded(z.number().int(), field.min, field.max);
    case "number":
      return bounded(z.number(), field.min, field.max);
    case "text":
      return bounded(z.string(), field.minLength, field.maxLength);
    case "boolean":
      return z.boolean();
    case "enum":
      return z.enum(field.options.map(o => o.value) as [string, ...string[]]);
    case "object":
      return buildConfigSchema(field.fields);
    case "array":
      return bounded(
        z.array(fieldToZod(field.items)),
        field.minItems,
        field.maxItems,
      );
  }
}

export function validateConfigValues(
  fields: FieldSpec[],
  values: unknown,
): z.ZodSafeParseResult<ConfigValues> {
  return buildConfigSchema(fields).safeParse(
    values,
  ) as z.ZodSafeParseResult<ConfigValues>;
}

/** Initial values for a form built from a template (uses declared defaults). */
export function buildDefaults(fields: FieldSpec[]): ConfigValues {
  const out: ConfigValues = {};
  for (const field of fields) {
    const value = defaultFor(field);
    if (value !== undefined) {
      out[field.key] = value;
    }
  }
  return out;
}

function defaultFor(field: FieldSpec): unknown {
  switch (field.type) {
    case "integer":
    case "number":
    case "text":
      return field.default;
    case "boolean":
      return field.default ?? false;
    case "enum":
      return field.default ?? field.options[0]?.value;
    case "object":
      return buildDefaults(field.fields);
    case "array":
      return [];
  }
}
