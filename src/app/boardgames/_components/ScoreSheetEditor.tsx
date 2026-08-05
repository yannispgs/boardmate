"use client";

import type {
  CategoryDef,
  CategorySubsection,
  ScoreSheetItem,
} from "@/lib/domain";
import { type MoveDirection, moveItem } from "@/lib/game/reorder";
import { isSubsection } from "@/lib/game/scoring";

const input =
  "min-w-0 flex-1 rounded-md border border-black/15 bg-white px-2 py-1 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";
const removeBtn =
  "shrink-0 rounded-md border border-black/10 px-2 py-1 text-xs text-zinc-500 transition hover:border-red-400 hover:text-red-600 dark:border-white/15";
const addBtn =
  "rounded-md border border-black/10 px-3 py-1 text-xs font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";
const moveBtn =
  "rounded-md border border-black/10 px-1.5 py-1 text-xs leading-none text-zinc-500 transition enabled:hover:border-indigo-400 enabled:hover:text-indigo-600 disabled:opacity-30 dark:border-white/15";

/** A fresh, stable key for a new field — labels can change, this never does. */
function newKey(): string {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Editor for a boardgame's end-of-game category scoresheet: standalone scored
 * fields and one level of titled sections holding their own fields. Nesting is
 * capped at that single level for now (no section inside a section). Existing
 * fields keep their key (and any colours / ranking bonus) so edits don't orphan
 * past games; new fields get a generated key. Rows reorder with `↑` / `↓` —
 * the order here is the order the score is asked for at the end of a game, so
 * it has to be fixable without retyping everything below.
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

  function moveAt(i: number, direction: MoveDirection) {
    onChange(moveItem(value, i, direction));
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
            // biome-ignore lint/suspicious/noArrayIndexKey: sections carry no stable id; a section is identified by where it sits.
            key={`section-${i}`}
            section={item}
            onChange={s => replace(i, s)}
            onMove={direction => moveAt(i, direction)}
            canUp={i > 0}
            canDown={i < value.length - 1}
            onRemove={() => removeAt(i)}
          />
        ) : (
          <FieldRow
            key={item.key}
            label={item.label}
            onLabel={label => replace(i, { ...item, label })}
            onMove={direction => moveAt(i, direction)}
            canUp={i > 0}
            canDown={i < value.length - 1}
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

/**
 * The `↑` / `↓` pair that reorders whatever row it sits on. Buttons rather than
 * drag-and-drop: this is a phone-first form that scrolls, and dragging a row in
 * a scrolling form fights the scroll instead of moving the row.
 */
function MoveButtons({
  onMove,
  canUp,
  canDown,
}: Readonly<{
  onMove: (direction: MoveDirection) => void;
  canUp: boolean;
  canDown: boolean;
}>) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onMove("up")}
        disabled={!canUp}
        aria-label="Monter"
        title="Monter"
        className={moveBtn}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove("down")}
        disabled={!canDown}
        aria-label="Descendre"
        title="Descendre"
        className={moveBtn}
      >
        ↓
      </button>
    </div>
  );
}

/** One scored line: a label input, the reorder controls and a remove control. */
function FieldRow({
  label,
  onLabel,
  onMove,
  canUp,
  canDown,
  onRemove,
  placeholder,
}: {
  label: string;
  onLabel: (label: string) => void;
  onMove: (direction: MoveDirection) => void;
  canUp: boolean;
  canDown: boolean;
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
      <MoveButtons onMove={onMove} canUp={canUp} canDown={canDown} />
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
  onMove,
  canUp,
  canDown,
  onRemove,
}: {
  section: CategorySubsection;
  onChange: (section: CategorySubsection) => void;
  onMove: (direction: MoveDirection) => void;
  canUp: boolean;
  canDown: boolean;
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

  function moveField(j: number, direction: MoveDirection) {
    onChange({ ...section, categories: moveItem(fields, j, direction) });
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
        <MoveButtons onMove={onMove} canUp={canUp} canDown={canDown} />
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
            onMove={direction => moveField(j, direction)}
            canUp={j > 0}
            canDown={j < fields.length - 1}
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
