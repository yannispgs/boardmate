"use client";

import { Field } from "@/components/Field";
import { MoveButtons } from "@/components/MoveButtons";
import type { TieBreakRule, TieBreakSource } from "@/lib/domain";
import { type MoveDirection, moveItem } from "@/lib/game/reorder";
import { newTieBreakRule } from "@/lib/game/tie-break-rules";

const input =
  "min-w-0 flex-1 rounded-md border border-black/15 bg-white px-2 py-1 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";
const select =
  "rounded-md border border-black/15 bg-white px-2 py-1 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";
const fieldCol = "flex min-w-0 flex-1 flex-col gap-1 text-[11px] text-zinc-500";
const removeBtn =
  "shrink-0 rounded-md border border-black/10 px-2 py-1 text-xs text-zinc-500 transition hover:border-red-400 hover:text-red-600 dark:border-white/15";
const addBtn =
  "self-start rounded-md border border-black/10 px-3 py-1 text-xs font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";

/**
 * Editor for the secondary rules that separate players tied on the final score.
 *
 * They are tried **in order** until one of them tells the tied players apart,
 * which is why the rows reorder rather than being sorted: the rulebook's own
 * order is the only correct one. A rule ranks either on a number the table
 * enters at the end of the game, or — Catan's « celui dont c'est le tour » — on
 * something the app already knows, in which case there is nothing to ask and
 * nothing to explain.
 *
 * Removing a rule needs no confirmation: past games keep the tie-break they
 * were actually decided by, recorded on the game itself.
 */
export function TieBreakEditor({
  value,
  onChange,
}: Readonly<{
  value: TieBreakRule[];
  onChange: (rules: TieBreakRule[]) => void;
}>) {
  function replace(i: number, rule: TieBreakRule) {
    onChange(value.map((r, idx) => (idx === i ? rule : r)));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 ? (
        <p className="text-xs text-zinc-400">
          Aucune règle&nbsp;: une égalité au score donne une victoire partagée.
        </p>
      ) : null}

      {value.map((rule, i) => (
        <RuleRow
          key={rule.key}
          rule={rule}
          onChange={r => replace(i, r)}
          onMove={direction => onChange(moveItem(value, i, direction))}
          canUp={i > 0}
          canDown={i < value.length - 1}
          onRemove={() => onChange(value.filter((_, idx) => idx !== i))}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, newTieBreakRule()])}
        className={addBtn}
      >
        + Règle de départage
      </button>
    </div>
  );
}

/** One rule: what it is called, which way it ranks, and where its value comes from. */
function RuleRow({
  rule,
  onChange,
  onMove,
  canUp,
  canDown,
  onRemove,
}: Readonly<{
  rule: TieBreakRule;
  onChange: (rule: TieBreakRule) => void;
  onMove: (direction: MoveDirection) => void;
  canUp: boolean;
  canDown: boolean;
  onRemove: () => void;
}>) {
  const asked = rule.source !== "currentTurn";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/15 p-2 dark:border-white/15">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={rule.label}
          onChange={e => onChange({ ...rule, label: e.target.value })}
          placeholder="Nom de la règle"
          aria-label="Nom de la règle"
          className={input}
        />
        <MoveButtons onMove={onMove} canUp={canUp} canDown={canDown} />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Supprimer la règle"
          className={removeBtn}
        >
          Suppr.
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Field
          className={fieldCol}
          label="Valeur comparée"
          tipLabel="Saisie par la table ou tour en cours"
          tip={
            <>
              <p>
                <strong>Saisie par la table en fin de partie</strong>&nbsp;:
                l&apos;application réclame un nombre à chaque joueur encore à
                égalité, puis les compare.
              </p>
              <p>
                <strong>Celui dont c&apos;est le tour</strong>&nbsp;: rien à
                saisir. L&apos;application sait déjà à qui appartient le tour en
                cours, et cette règle le désigne vainqueur (Catan).
              </p>
            </>
          }
        >
          {id => (
            <select
              id={id}
              value={rule.source}
              onChange={e =>
                onChange({ ...rule, source: e.target.value as TieBreakSource })
              }
              className={select}
            >
              <option value="ask">Saisie par la table en fin de partie</option>
              <option value="currentTurn">Celui dont c&apos;est le tour</option>
            </select>
          )}
        </Field>

        {/* Nothing to rank when the app already knows the answer: the player
            holding the turn is the one such a rule favours, always. */}
        {asked ? (
          <Field
            className={fieldCol}
            label="Qui l'emporte"
            tipLabel="Le sens de la comparaison"
            tip={
              <>
                <p>
                  Porte sur la valeur de <em>cette règle</em>, pas sur le score
                  de la partie.
                </p>
                <p>
                  <strong>La plus grande valeur</strong>&nbsp;: le joueur qui en
                  a le plus est départagé devant.
                </p>
                <p>
                  <strong>La plus petite valeur</strong>&nbsp;: c&apos;est celui
                  qui en a le moins qui passe devant.
                </p>
              </>
            }
          >
            {id => (
              <select
                id={id}
                value={rule.direction ?? "highest"}
                onChange={e =>
                  onChange({
                    ...rule,
                    direction: e.target.value as TieBreakRule["direction"],
                  })
                }
                className={select}
              >
                <option value="highest">La plus grande valeur</option>
                <option value="lowest">La plus petite valeur</option>
              </select>
            )}
          </Field>
        ) : null}
      </div>

      {asked ? (
        <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
          <span>Aide affichée à la saisie (facultatif)</span>
          <input
            value={rule.help ?? ""}
            onChange={e => onChange({ ...rule, help: e.target.value })}
            placeholder="Ce que la table doit compter"
            className={input}
          />
        </label>
      ) : null}
    </div>
  );
}
