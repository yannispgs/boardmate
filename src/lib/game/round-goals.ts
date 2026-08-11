import type { RoundGoal, RoundGoalParams } from "@/lib/domain";

/** What a placeholder reads as while its value hasn't been chosen. */
const HOLE = "X";

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Fills a goal's `{param}` placeholders using `resolve`, which answers with the
 * text for a parameter key — or `null` to leave the hole punched.
 */
function fill(
  goal: RoundGoal,
  resolve: (paramKey: string) => string | null,
): string {
  return goal.label.replace(PLACEHOLDER, (_match, paramKey: string) => {
    return resolve(paramKey) ?? HOLE;
  });
}

/**
 * The goal as it reads in the picker's list, before any value is chosen: every
 * variable part is punched out — « Œufs dans X ». A goal without parameters is
 * already its own title.
 */
export function goalTemplateLabel(goal: RoundGoal): string {
  return fill(goal, () => null);
}

/**
 * The goal as it reads once set up — « Œufs dans Mer ». Any parameter left
 * unanswered (or answered with a value the catalogue doesn't offer) keeps its
 * hole, so a half-filled goal never reads as a complete one.
 */
export function formatGoalLabel(
  goal: RoundGoal,
  values: RoundGoalParams,
): string {
  return fill(goal, paramKey => {
    const param = goal.params.find(p => p.key === paramKey);
    const option = param?.options.find(o => o.value === values[paramKey]);

    return option?.label ?? null;
  });
}

/** Whether every parameter of the goal has been answered with a known value. */
export function isGoalComplete(
  goal: RoundGoal,
  values: RoundGoalParams,
): boolean {
  return goal.params.every(param => {
    return param.options.some(o => o.value === values[param.key]);
  });
}

/** A titled group of goal tiles, as one `<optgroup>` of the setup picker. */
export interface GoalGroup {
  label: string;
  goals: RoundGoal[];
}

/**
 * The catalogue split the way the setup picker offers it: the tiles that read
 * as they are, then those whose variable part still has to be answered. Empty
 * groups are dropped, so a catalogue of one-offs shows no heading at all.
 */
export function goalGroups(catalogue: RoundGoal[]): GoalGroup[] {
  const groups = [
    {
      label: "Objectifs uniques",
      goals: catalogue.filter(goal => goal.params.length === 0),
    },
    {
      label: "À préciser",
      goals: catalogue.filter(goal => goal.params.length > 0),
    },
  ];

  return groups.filter(group => group.goals.length > 0);
}

/**
 * The goal tiles a game can be set up with: the base game's catalogue plus the
 * ones each active extension brings, in extension order. A tile an extension
 * re-declares under a key the base already has is ignored — the base game's
 * wording wins, and statistics keep one row per key.
 */
export function goalCatalogue(
  base: RoundGoal[],
  fromExtensions: RoundGoal[][],
): RoundGoal[] {
  const seen = new Set(base.map(g => g.key));
  const catalogue = [...base];

  for (const goals of fromExtensions) {
    for (const goal of goals) {
      if (!seen.has(goal.key)) {
        seen.add(goal.key);
        catalogue.push(goal);
      }
    }
  }

  return catalogue;
}
