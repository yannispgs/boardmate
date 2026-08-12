"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import type { RoundGoal, RoundGoalOption, RoundGoalParam } from "@/lib/domain";
import { isCategoryIconId } from "@/lib/game/category-icons";
import { type GoalGroup, goalTemplateLabel } from "@/lib/game/round-goals";
import {
  isGoalAvailable,
  isParamValueAvailable,
  type StagePick,
} from "@/lib/game/stage";

/**
 * The tile laid on one stage: the family, then its variable part. Shared by the
 * launch funnel, which asks for it before anybody plays, and by the "partie
 * déjà jouée" form, which asks for it once everything is over — the question is
 * the same one, and a tile spent on another manche is out of the box either way.
 */
export function StageGoalPicker({
  groups,
  catalogue,
  pick,
  taken,
  onPick,
}: Readonly<{
  groups: GoalGroup[];
  catalogue: RoundGoal[];
  pick: StagePick;
  /** What the other stages laid — a tile is only in the box once. */
  taken: StagePick[];
  onPick: (pick: StagePick) => void;
}>) {
  const goal = catalogue.find(g => g.key === pick.goalKey);

  return (
    <>
      <select
        value={pick.goalKey}
        onChange={e => onPick({ goalKey: e.target.value, goalParams: {} })}
        className="rounded-lg border border-black/15 bg-white px-2 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
      >
        <option value="">Choisis un objectif…</option>
        {groups.map(group => (
          <optgroup key={group.label} label={group.label}>
            {group.goals.map(g => (
              <option
                key={g.key}
                value={g.key}
                disabled={!isGoalAvailable(g, taken)}
              >
                {goalTemplateLabel(g)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {goal === undefined
        ? null
        : goal.params.map(param => (
            <ParamChips
              key={param.key}
              param={param}
              value={pick.goalParams[param.key] ?? ""}
              isAvailable={value =>
                isParamValueAvailable(param.key, value, taken)
              }
              onPick={value => {
                onPick({
                  goalKey: pick.goalKey,
                  goalParams: { ...pick.goalParams, [param.key]: value },
                });
              }}
            />
          ))}
    </>
  );
}

/**
 * A goal family's variable part as a row of chips rather than a second select:
 * the values are few, they carry the symbol printed on the tile, and a chip is
 * a target a thumb can hit without opening anything.
 */
function ParamChips({
  param,
  value,
  isAvailable,
  onPick,
}: Readonly<{
  param: RoundGoalParam;
  value: string;
  /** Whether the tile that value would complete is still in the box. */
  isAvailable: (value: string) => boolean;
  onPick: (value: string) => void;
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {param.label}
      </span>
      <div className="flex flex-wrap gap-2">
        {param.options.map(option => (
          <button
            key={option.value}
            type="button"
            disabled={!isAvailable(option.value)}
            onClick={() => onPick(option.value)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-40 ${
              option.value === value
                ? "border-indigo-500 bg-indigo-600 text-white"
                : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            }`}
          >
            <OptionIcon option={option} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The symbol printed on the tile, when the app ships that drawing. */
function OptionIcon({ option }: Readonly<{ option: RoundGoalOption }>) {
  if (!isCategoryIconId(option.icon)) {
    return null;
  }

  return <CategoryIcon id={option.icon} title={option.label} />;
}
