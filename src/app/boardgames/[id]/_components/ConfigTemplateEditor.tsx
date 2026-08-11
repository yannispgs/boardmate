"use client";

import { type FormEvent, useState } from "react";
import { ErrorText } from "@/components/ErrorText";
import {
  blankField,
  cleanTemplateFields,
  type ScalarFieldType,
  TIMER_FIELDS,
} from "@/lib/config/template-fields";
import type { EnumFieldSpec, FieldSpec } from "@/lib/domain";

const inputClass =
  "rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";

const TYPE_LABELS: { value: ScalarFieldType; label: string }[] = [
  { value: "integer", label: "Entier" },
  { value: "number", label: "Nombre" },
  { value: "text", label: "Texte" },
  { value: "boolean", label: "Booléen (oui/non)" },
  { value: "enum", label: "Liste de choix" },
];

const numOrUndef = (s: string): number | undefined =>
  s.trim() === "" ? undefined : Number(s);

/**
 * Edits a config template's field *definitions* — the tunable parameters a game
 * exposes (timer, options, thresholds…). Supports the scalar leaf types the
 * config forms render (integer/number/text/boolean/enum). A "moniteur" preset
 * drops in the three timer fields with the exact keys the schedule reads.
 */
export function ConfigTemplateEditor({
  initialFields,
  onSave,
  onCancel,
}: Readonly<{
  initialFields: FieldSpec[];
  onSave: (fields: FieldSpec[]) => Promise<void>;
  onCancel: () => void;
}>) {
  const [fields, setFields] = useState<FieldSpec[]>(initialFields);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patch = (i: number, p: Partial<FieldSpec>) => {
    setFields(prev =>
      prev.map((f, idx) => (idx === i ? ({ ...f, ...p } as FieldSpec) : f)),
    );
  };

  const changeType = (i: number, type: ScalarFieldType) => {
    setFields(prev =>
      prev.map((f, idx) =>
        idx === i ? { ...blankField(type), key: f.key, label: f.label } : f,
      ),
    );
  };

  const remove = (i: number) => {
    setFields(prev => prev.filter((_, idx) => idx !== i));
  };

  const addTimer = () => {
    setFields(prev => {
      const keys = new Set(prev.map(f => f.key));
      return [...prev, ...TIMER_FIELDS.filter(f => !keys.has(f.key))];
    });
  };

  // Enum-option helpers (operate on the field at index `i`).
  const setOptions = (i: number, options: EnumFieldSpec["options"]) => {
    setFields(prev =>
      prev.map((f, idx) =>
        idx === i && f.type === "enum" ? { ...f, options } : f,
      ),
    );
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleaned = cleanTemplateFields(fields);
    if (cleaned.length === 0) {
      setError("Ajoute au moins un champ (avec une clé et un libellé).");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave(cleaned);
    } catch {
      setError("Enregistrement impossible. Réessaie.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-black/10 p-4 dark:border-white/10"
    >
      <p className="text-xs text-zinc-500">
        Les paramètres réglables du jeu (timer, options…). Chaque champ a une
        clé interne, un libellé et un type ; sa valeur par défaut se règle
        ensuite.
      </p>

      <ul className="flex flex-col gap-3">
        {fields.map((field, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: fields carry no stable id while editing
            key={i} // NOSONAR: same reason as the biome-ignore above.
            className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <input
                value={field.key}
                onChange={e => patch(i, { key: e.target.value })}
                placeholder="clé (ex. pointsToWin)"
                aria-label="Clé du champ"
                className={inputClass}
              />
              <input
                value={field.label}
                onChange={e => patch(i, { label: e.target.value })}
                placeholder="libellé"
                aria-label="Libellé du champ"
                className={inputClass}
              />
              <select
                value={field.type}
                onChange={e => changeType(i, e.target.value as ScalarFieldType)}
                aria-label="Type du champ"
                className={inputClass}
              >
                {TYPE_LABELS.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <FieldExtras
              field={field}
              i={i}
              patch={patch}
              setOptions={setOptions}
            />

            <button
              type="button"
              onClick={() => remove(i)}
              className="self-start text-xs text-red-600 hover:underline dark:text-red-400"
            >
              Retirer ce champ
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFields(prev => [...prev, blankField("integer")])}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          + Ajouter un champ
        </button>
        <button
          type="button"
          onClick={addTimer}
          className="rounded-lg border border-indigo-500/40 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-500/10 dark:text-indigo-400"
        >
          ⏱️ Ajouter le moniteur (timer)
        </button>
      </div>

      <ErrorText message={error} />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Enregistrer la configuration
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

/** The type-specific controls (bounds / default / enum options) for one field. */
function FieldExtras({
  field,
  i,
  patch,
  setOptions,
}: Readonly<{
  field: FieldSpec;
  i: number;
  patch: (i: number, p: Partial<FieldSpec>) => void;
  setOptions: (i: number, options: EnumFieldSpec["options"]) => void;
}>) {
  if (field.type === "integer" || field.type === "number") {
    return (
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-0.5 text-[11px] text-zinc-500">
          <span>Min</span>
          <input
            type="number"
            value={field.min ?? ""}
            onChange={e => patch(i, { min: numOrUndef(e.target.value) })}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-zinc-500">
          <span>Max</span>
          <input
            type="number"
            value={field.max ?? ""}
            onChange={e => patch(i, { max: numOrUndef(e.target.value) })}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-zinc-500">
          <span>Défaut</span>
          <input
            type="number"
            value={field.default ?? ""}
            onChange={e => patch(i, { default: numOrUndef(e.target.value) })}
            className={inputClass}
          />
        </label>
      </div>
    );
  }

  if (field.type === "text") {
    return (
      <label className="flex flex-col gap-0.5 text-[11px] text-zinc-500">
        <span>Valeur par défaut</span>
        <input
          value={field.default ?? ""}
          onChange={e => patch(i, { default: e.target.value })}
          className={inputClass}
        />
      </label>
    );
  }

  if (field.type === "boolean") {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.default === true}
            onChange={e => patch(i, { default: e.target.checked })}
          />
          <span>Coché par défaut</span>
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-zinc-500">
          <span>
            Points ajoutés au score à atteindre quand l&apos;option est active
          </span>
          <input
            type="number"
            min={0}
            value={field.targetModifier ?? ""}
            onChange={e =>
              patch(i, { targetModifier: numOrUndef(e.target.value) })
            }
            className={inputClass}
          />
        </label>
      </div>
    );
  }

  if (field.type === "enum") {
    const options = field.options;
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-zinc-500">Choix possibles</span>
        {options.map((opt, oi) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: options carry no stable id while editing
            key={oi} // NOSONAR: same reason as the biome-ignore above.
            className="flex gap-2"
          >
            <input
              value={opt.value}
              onChange={e =>
                setOptions(
                  i,
                  options.map((o, idx) =>
                    idx === oi ? { ...o, value: e.target.value } : o,
                  ),
                )
              }
              placeholder="valeur"
              aria-label="Valeur de l'option"
              className={`flex-1 ${inputClass}`}
            />
            <input
              value={opt.label}
              onChange={e =>
                setOptions(
                  i,
                  options.map((o, idx) =>
                    idx === oi ? { ...o, label: e.target.value } : o,
                  ),
                )
              }
              placeholder="libellé"
              aria-label="Libellé de l'option"
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={() =>
                setOptions(
                  i,
                  options.filter((_, idx) => idx !== oi),
                )
              }
              aria-label="Retirer l'option"
              className="px-2 text-red-600 dark:text-red-400"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOptions(i, [...options, { value: "", label: "" }])}
          className="self-start text-xs text-indigo-600 hover:underline dark:text-indigo-400"
        >
          + Ajouter un choix
        </button>
      </div>
    );
  }

  // object / array are declared but not editable here.
  return (
    <p className="text-xs text-amber-600 dark:text-amber-400">
      Type « {field.type} » non éditable ici.
    </p>
  );
}
