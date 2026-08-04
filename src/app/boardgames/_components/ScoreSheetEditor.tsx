"use client";

import type {
  CategoryDef,
  CategorySubsection,
  ScoreSheetItem,
} from "@/lib/domain";
import { isSubsection } from "@/lib/game/scoring";

const input =
  "min-w-0 flex-1 rounded-md border border-black/15 bg-white px-2 py-1 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";
const removeBtn =
  "shrink-0 rounded-md border border-black/10 px-2 py-1 text-xs text-zinc-500 transition hover:border-red-400 hover:text-red-600 dark:border-white/15";
const addBtn =
  "rounded-md border border-black/10 px-3 py-1 text-xs font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";

/** A fresh, stable key for a new field — labels can change, this never does. */
function newKey(): string {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Editor for a boardgame's end-of-game category scoresheet: standalone scored
 * fields and one level of titled sections holding their own fields. Nesting is
 * capped at that single level for now (no section inside a section). Existing
 * fields keep their key (and any colours / ranking bonus) so edits don't orphan
 * past games; new fields get a generated key.
 */
export function ScoreSheetEditor({
  value,
  onChange,
}: {
  value: ScoreSheetItem[];
  onChange: (sheet: ScoreSheetItem[]) => void;
}) {
  function replace(i: number, item: ScoreSheetItem) {
    onChange(value.map((it, idx) => (idx === i ? item : it)));
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-zinc-500">Catégories de points</span>

      {value.length === 0 ? (
        <p className="text-xs text-zinc-400">
          Aucune catégorie. Ajoute un champ ou une section.
        </p>
      ) : null}

      {value.map((item, i) =>
        isSubsection(item) ? (
          <SectionRow
            // biome-ignore lint/suspicious/noArrayIndexKey: sections carry no stable id; order is user-controlled and not reordered.
            key={`section-${i}`}
            section={item}
            onChange={s => replace(i, s)}
            onRemove={() => removeAt(i)}
          />
        ) : (
          <FieldRow
            key={item.key}
            label={item.label}
            onLabel={label => replace(i, { ...item, label })}
            onRemove={() => removeAt(i)}
            placeholder="Nom du champ"
          />
        ),
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange([...value, { key: newKey(), label: "" }])}
          className={addBtn}
        >
          + Champ
        </button>
        <button
          type="button"
          onClick={() => onChange([...value, { label: "", categories: [] }])}
          className={addBtn}
        >
          + Section
        </button>
      </div>
    </div>
  );
}

/** One scored line: a label input and a remove control. */
function FieldRow({
  label,
  onLabel,
  onRemove,
  placeholder,
}: {
  label: string;
  onLabel: (label: string) => void;
  onRemove: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={label}
        onChange={e => onLabel(e.target.value)}
        placeholder={placeholder}
        className={input}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Supprimer"
        className={removeBtn}
      >
        Suppr.
      </button>
    </div>
  );
}

/** A titled section holding its own fields (one level deep). */
function SectionRow({
  section,
  onChange,
  onRemove,
}: {
  section: CategorySubsection;
  onChange: (section: CategorySubsection) => void;
  onRemove: () => void;
}) {
  const fields = section.categories;

  function replaceField(j: number, def: CategoryDef) {
    onChange({
      ...section,
      categories: fields.map((f, idx) => (idx === j ? def : f)),
    });
  }

  function removeField(j: number) {
    onChange({
      ...section,
      categories: fields.filter((_, idx) => idx !== j),
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/15 p-2 dark:border-white/15">
      <div className="flex items-center gap-2">
        <input
          value={section.label}
          onChange={e => onChange({ ...section, label: e.target.value })}
          placeholder="Nom de la section"
          className={`${input} font-semibold`}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Supprimer la section"
          className={removeBtn}
        >
          Suppr.
        </button>
      </div>

      <div className="flex flex-col gap-2 pl-3">
        {fields.map((def, j) => (
          <FieldRow
            key={def.key}
            label={def.label}
            onLabel={label => replaceField(j, { ...def, label })}
            onRemove={() => removeField(j)}
            placeholder="Nom du champ"
          />
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...section,
              categories: [...fields, { key: newKey(), label: "" }],
            })
          }
          className={`${addBtn} self-start`}
        >
          + Champ dans la section
        </button>
      </div>

      <label className="flex items-center gap-2 pl-3 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={section.showDetail === true}
          onChange={e =>
            onChange({ ...section, showDetail: e.target.checked || undefined })
          }
          className="h-3.5 w-3.5 accent-indigo-600"
        />
        Détailler cette section dans les statistiques
      </label>
    </div>
  );
}
