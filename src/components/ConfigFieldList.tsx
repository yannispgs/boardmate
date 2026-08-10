"use client";

import type { ConfigValues, FieldSpec } from "@/lib/domain";
import { ConfigField } from "./ConfigField";

/**
 * Renders a template's fields as a list of {@link ConfigField}s, wired to a
 * shared `values`/`errors` map. Shared by every form that edits config values
 * against a template (config instances and a game's default configuration).
 */
export function ConfigFieldList({
  fields,
  values,
  errors,
  onChange,
}: Readonly<{
  fields: FieldSpec[];
  values: ConfigValues;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
}>) {
  return (
    <>
      {fields.map(field => (
        <ConfigField
          key={field.key}
          field={field}
          value={values[field.key]}
          error={errors[field.key]}
          onChange={v => onChange(field.key, v)}
        />
      ))}
    </>
  );
}
