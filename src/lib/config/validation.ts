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

function baseFieldToZod(field: FieldSpec): z.ZodType {
  switch (field.type) {
    case "integer": {
      let s = z.number().int();
      if (field.min != null) s = s.min(field.min);
      if (field.max != null) s = s.max(field.max);
      return s;
    }
    case "number": {
      let s = z.number();
      if (field.min != null) s = s.min(field.min);
      if (field.max != null) s = s.max(field.max);
      return s;
    }
    case "text": {
      let s = z.string();
      if (field.minLength != null) s = s.min(field.minLength);
      if (field.maxLength != null) s = s.max(field.maxLength);
      return s;
    }
    case "boolean":
      return z.boolean();
    case "enum": {
      const values = field.options.map((o) => o.value);
      return z.enum(values as [string, ...string[]]);
    }
    case "object":
      return buildConfigSchema(field.fields);
    case "array": {
      let s = z.array(fieldToZod(field.items));
      if (field.minItems != null) s = s.min(field.minItems);
      if (field.maxItems != null) s = s.max(field.maxItems);
      return s;
    }
  }
}

export function validateConfigValues(
  fields: FieldSpec[],
  values: unknown,
): z.ZodSafeParseResult<ConfigValues> {
  return buildConfigSchema(fields).safeParse(values) as z.ZodSafeParseResult<ConfigValues>;
}

/** Initial values for a form built from a template (uses declared defaults). */
export function buildDefaults(fields: FieldSpec[]): ConfigValues {
  const out: ConfigValues = {};
  for (const field of fields) {
    const value = defaultFor(field);
    if (value !== undefined) out[field.key] = value;
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
