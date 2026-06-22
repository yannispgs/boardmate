"use client";

import type { FieldSpec } from "@/lib/domain";

const inputClass =
  "rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";

/**
 * Renders a single config field from its {@link FieldSpec}. v1 supports the
 * scalar leaf types (integer, number, text, boolean, enum). object/array are
 * declared in the type system and handled by the validator, but the form UI
 * for them is deferred — they render an explicit "not supported yet" note.
 */
export function ConfigField({
  field,
  value,
  onChange,
  error,
}: {
  field: FieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const label = (
    <span className="flex items-baseline gap-2">
      <span className="font-medium">{field.label}</span>
      {field.required === false ? (
        <span className="text-xs text-zinc-400">(optionnel)</span>
      ) : null}
    </span>
  );

  return (
    <div className="flex flex-col gap-1">
      {field.type === "boolean" ? (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4"
          />
          {label}
        </label>
      ) : (
        <label htmlFor={field.key} className="flex flex-col gap-1">
          {label}
          {field.description ? (
            <span className="text-xs text-zinc-500">{field.description}</span>
          ) : null}
          <Control field={field} value={value} onChange={onChange} />
        </label>
      )}
      {error ? (
        <span role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function Control({
  field,
  value,
  onChange,
}: {
  field: FieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case "integer":
    case "number":
      return (
        <input
          id={field.key}
          type="number"
          inputMode={field.type === "integer" ? "numeric" : "decimal"}
          step={field.type === "integer" ? 1 : "any"}
          min={field.min}
          max={field.max}
          value={typeof value === "number" ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          className={inputClass}
        />
      );
    case "text":
      return (
        <input
          id={field.key}
          type="text"
          minLength={field.minLength}
          maxLength={field.maxLength}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      );
    case "enum":
      return (
        <select
          id={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    default:
      // object / array — declared and validated, but no v1 form UI.
      return (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          Type « {field.type} » non éditable dans cette version.
        </span>
      );
  }
}
