"use client";

import { MoveButtons } from "@/components/MoveButtons";
import { useConfirm } from "@/components/use-confirm";
import type {
  CategoryDef,
  CategorySubsection,
  ScoreSheetItem,
} from "@/lib/domain";
import type { CategoryIconId } from "@/lib/game/category-icons";
import { newEditorKey } from "@/lib/game/editor-key";
import { type MoveDirection, moveItem } from "@/lib/game/reorder";
import { isSubsection, sheetCategories } from "@/lib/game/scoring";

/**
 * Asks before a removal that would bury already-recorded points, and removes
 * outright when there is nothing to lose.
 */
type GuardRemoval = (item: ScoreSheetItem, remove: () => void) => void;

import { CategoryIconPicker } from "./CategoryIconPicker";

const input =
  "min-w-0 flex-1 rounded-md border border-black/15 bg-white px-2 py-1 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";
const removeBtn =
  "shrink-0 rounded-md border border-black/10 px-2 py-1 text-xs text-zinc-500 transition hover:border-red-400 hover:text-red-600 dark:border-white/15";
const addBtn =
  "rounded-md border border-black/10 px-3 py-1 text-xs font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";

/**
 * Editor for a boardgame's end-of-game category scoresheet: standalone scored
 * fields and one level of titled sections holding their own fields. Nesting is
 * capped at that single level for now (no section inside a section). Existing
 * fields keep their key (and any colours / ranking bonus) so edits don't orphan
 * past games; new fields get a generated key. Rows reorder with `↑` / `↓` —
 * the order here is the order the score is asked for at the end of a game, so
 * it has to be fixable without retyping everything below.
 *
 * `usage` (games already scored under each key) turns removals into a question
 * whenever there is history behind the line. Renaming and reordering need no
 * such warning: they never move a point from one key to another.
 */
export function ScoreSheetEditor({
  value,
  onChange,
  usage = {},
}: Readonly<{
  value: ScoreSheetItem[];
  onChange: (sheet: ScoreSheetItem[]) => void;
  usage?: Record<string, number>;
}>) {
  const { requestConfirm, confirmDialog } = useConfirm();

  function replace(i: number, item: ScoreSheetItem) {
    onChange(value.map((it, idx) => (idx === i ? item : it)));
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  const guardRemoval: GuardRemoval = (item, remove) => {
    const scored = sheetCategories([item])
      .map(c => ({
        key: c.key,
        label: c.label.trim(),
        games: usage[c.key] ?? 0,
      }))
      .filter(line => line.games > 0);

    // Nothing was ever scored here — a confirmation everyone learns to dismiss
    // protects nothing, so don't ask.
    if (scored.length === 0) {
      remove();

      return;
    }

    const section = isSubsection(item);

    requestConfirm({
      message: `Supprimer ${section ? "la section" : "la ligne"} « ${item.label.trim() || "sans nom"} » ?\n\nDes points y sont déjà enregistrés. Ils resteront en base, mais ne s'afficheront plus nulle part : ni sur la feuille de score des parties passées, ni dans les statistiques.`,
      confirmLabel: "Supprimer quand même",
      details: <ScoredLines lines={scored} />,
      onConfirm: remove,
    });
  };

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
            key={`section-${i}`} // NOSONAR: same reason as the biome-ignore above.
            section={item}
            onChange={s => replace(i, s)}
            onMove={direction => moveAt(i, direction)}
            canUp={i > 0}
            canDown={i < value.length - 1}
            onRemove={() => guardRemoval(item, () => removeAt(i))}
            guardRemoval={guardRemoval}
          />
        ) : (
          <FieldRow
            key={item.key}
            label={item.label}
            icon={item.icon}
            onLabel={label => replace(i, { ...item, label })}
            onIcon={icon => replace(i, { ...item, icon })}
            onMove={direction => moveAt(i, direction)}
            canUp={i > 0}
            canDown={i < value.length - 1}
            onRemove={() => guardRemoval(item, () => removeAt(i))}
            placeholder="Nom du champ"
          />
        ),
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            onChange([...value, { key: newEditorKey(), label: "" }])
          }
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

      {confirmDialog}
    </div>
  );
}

/** What a removal would bury, line by line, inside the confirmation. */
function ScoredLines({
  lines,
}: Readonly<{ lines: Array<{ key: string; label: string; games: number }> }>) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {lines.map(line => (
        <li key={line.key} className="flex justify-between gap-3">
          <span className="truncate">{line.label || "Sans nom"}</span>
          <span className="shrink-0 text-zinc-500">
            {line.games} partie{line.games > 1 ? "s" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * One scored line: a label input, its symbol, the reorder controls and a remove
 * control.
 */
function FieldRow({
  label,
  icon,
  onLabel,
  onIcon,
  onMove,
  canUp,
  canDown,
  onRemove,
  placeholder,
}: Readonly<{
  label: string;
  icon: string | undefined;
  onLabel: (label: string) => void;
  onIcon: (icon: CategoryIconId | undefined) => void;
  onMove: (direction: MoveDirection) => void;
  canUp: boolean;
  canDown: boolean;
  onRemove: () => void;
  placeholder: string;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={label}
        onChange={e => onLabel(e.target.value)}
        placeholder={placeholder}
        className={input}
      />
      <CategoryIconPicker icon={icon} label={label} onIcon={onIcon} />
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
  guardRemoval,
}: Readonly<{
  section: CategorySubsection;
  onChange: (section: CategorySubsection) => void;
  onMove: (direction: MoveDirection) => void;
  canUp: boolean;
  canDown: boolean;
  onRemove: () => void;
  guardRemoval: GuardRemoval;
}>) {
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
            icon={def.icon}
            onLabel={label => replaceField(j, { ...def, label })}
            onIcon={icon => replaceField(j, { ...def, icon })}
            onMove={direction => moveField(j, direction)}
            canUp={j > 0}
            canDown={j < fields.length - 1}
            onRemove={() => guardRemoval(def, () => removeField(j))}
            placeholder="Nom du champ"
          />
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...section,
              categories: [...fields, { key: newEditorKey(), label: "" }],
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
        <span>Détailler cette section dans les statistiques</span>
      </label>
    </div>
  );
}
