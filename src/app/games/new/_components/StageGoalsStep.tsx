"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { ErrorText } from "@/components/ErrorText";
import type { RoundGoal, RoundGoalOption, RoundGoalParam } from "@/lib/domain";
import { isCategoryIconId } from "@/lib/game/category-icons";
import {
  type GoalGroup,
  goalGroups,
  goalTemplateLabel,
} from "@/lib/game/round-goals";
import {
  isCalendarReady,
  isGoalAvailable,
  isParamValueAvailable,
  type StagePick,
  stageCalendar,
} from "@/lib/game/stage";
import { FunnelStep } from "./FunnelStep";

/**
 * The goal tiles laid on the board before the first bird is played (Wingspan):
 * one per manche, in the order they will be scored. They are asked here rather
 * than manche by manche because they are drawn at setup — and because the tile
 * that scores nothing hands the table an extra turn in every following manche,
 * so the game's whole length only becomes known once the four are down.
 */
export function StageGoalsStep({
  stageLabel,
  schedule,
  catalogue,
  picks,
  creating,
  error,
  onPicks,
  onBack,
  onValidate,
}: Readonly<{
  /** What this game calls a stage — « Manche ». */
  stageLabel: string;
  /** The box's laps per stage, before any tile lengthens them. */
  schedule: number[];
  /** Every tile that can be laid, the active extensions' included. */
  catalogue: RoundGoal[];
  picks: StagePick[];
  creating: boolean;
  error: string | null;
  onPicks: (picks: StagePick[]) => void;
  onBack: () => void;
  onValidate: () => void;
}>) {
  const groups = goalGroups(catalogue);
  const stages = stageCalendar(schedule, picks, catalogue);
  const ready = isCalendarReady(stages, catalogue);

  function setPick(index: number, pick: StagePick) {
    onPicks(schedule.map((_, i) => (i === index ? pick : pickAt(picks, i))));
  }

  return (
    <FunnelStep
      title={`5 · Choix des objectifs de ${stageLabel.toLowerCase()}`}
      onBack={onBack}
      footer={
        <>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {stages.map(stage => stage.turns).join(" · ")} tours
          </p>

          <ErrorText message={error} />

          <button
            type="button"
            disabled={creating || !ready}
            onClick={onValidate}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {creating ? "Création…" : "Lancer la partie"}
          </button>
        </>
      }
    >
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Dans l&apos;ordre où ils seront comptés. Un objectif qui ne rapporte
        rien rend son cube, ce qui allonge les {stageLabel.toLowerCase()}s
        suivantes.
      </p>

      <div className="flex flex-col gap-3">
        {stages.map(({ stage, turns }) => (
          // The stages have no identity of their own: their rank in the
          // calendar is what tells them apart, and it never moves.
          <StageRow
            key={stage}
            label={`${stageLabel} ${stage}`}
            turns={turns}
            groups={groups}
            catalogue={catalogue}
            pick={pickAt(picks, stage - 1)}
            taken={picks.filter((_p, i) => i !== stage - 1)}
            onPick={pick => setPick(stage - 1, pick)}
          />
        ))}
      </div>
    </FunnelStep>
  );
}

/** The tile chosen for one stage, or the empty pick before anything is chosen. */
function pickAt(picks: StagePick[], index: number): StagePick {
  return picks[index] ?? { goalKey: "", goalParams: {} };
}

/** One manche: the tile it scores, its variable part, and how long it runs. */
function StageRow({
  label,
  turns,
  groups,
  catalogue,
  pick,
  taken,
  onPick,
}: Readonly<{
  label: string;
  turns: number;
  groups: GoalGroup[];
  catalogue: RoundGoal[];
  pick: StagePick;
  /** What the other manches laid — a tile is only in the box once. */
  taken: StagePick[];
  onPick: (pick: StagePick) => void;
}>) {
  const goal = catalogue.find(g => g.key === pick.goalKey);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {turns} tours
        </span>
      </div>

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
    </div>
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
