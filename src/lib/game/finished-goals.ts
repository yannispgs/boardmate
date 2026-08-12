/**
 * The end-of-stage goals of a game entered **after the fact** (Wingspan).
 *
 * A game played in the app records its manches as it goes: the tiles are laid
 * at setup, the points typed as each manche closes. A game recorded afterwards
 * has neither, so the whole calendar is rebuilt at once from what the table
 * remembers — which tile scored each manche, and what everyone took from it.
 *
 * It is deliberately **all or nothing**. A calendar missing a manche would sum
 * into an « Objectifs de manche » line short of the points that manche paid, and
 * would tell the goal stats that tile was never played. Half a memory is worse
 * than none, so an incomplete block is simply not recorded.
 *
 * Pure: no vendor types, unit-tested.
 */

import type {
  CategoryDef,
  GameStage,
  PlayerId,
  RoundGoal,
  StageScore,
} from "@/lib/domain";

import { formatGoalLabel } from "./round-goals";
import { isCalendarReady, type StagePick, stageCalendar } from "./stage";

/** Per-player points entered per stage, keyed `player → stage key → text`. */
export type StageGoalRaw = Record<string, Record<string, string>>;

/** What the points grid calls the column of stage `n` — never shown, only keyed. */
export function stageKey(stage: number): string {
  return `stage-${stage}`;
}

/**
 * The manches as lines of a score grid, so the points can be asked for on the
 * very grid the rest of the sheet uses instead of a second one built by hand.
 * A manche whose tile isn't chosen yet reads by its number alone.
 */
export function stageGoalSheet(
  stageLabel: string,
  stages: readonly GameStage[],
  catalogue: readonly RoundGoal[],
): CategoryDef[] {
  return stages.map(stage => {
    const goal = catalogue.find(g => g.key === stage.goalKey);
    const name =
      goal === undefined ? "" : formatGoalLabel(goal, stage.goalParams);

    return {
      key: stageKey(stage.stage),
      label:
        name === ""
          ? `${stageLabel} ${stage.stage}`
          : `${stageLabel} ${stage.stage} · ${name}`,
    };
  });
}

/** The goals of a recorded game, and whether they are complete enough to keep. */
export interface FinishedGoals {
  /** The calendar the tiles describe — the same one the funnel would compute. */
  stages: GameStage[];
  /** Every manche has a tile, parameters answered — the calendar is laid out. */
  tilesReady: boolean;
  /** One row per player per stage; empty until the whole block is filled. */
  scores: StageScore[];
  /** Every tile chosen and every cell filled. */
  complete: boolean;
  /** Cells still waiting for a number, so the form can say what is missing. */
  remaining: number;
}

/**
 * Two sets of per-player cells, the second overwriting the first cell by cell.
 * Everything already typed on the sheet's other lines is kept: the manches own
 * the one line they add up to, and nothing else.
 */
export function mergeCells(
  base: StageGoalRaw,
  extra: StageGoalRaw,
): StageGoalRaw {
  const merged = { ...base };

  for (const [playerId, cells] of Object.entries(extra)) {
    merged[playerId] = { ...merged[playerId], ...cells };
  }

  return merged;
}

/**
 * Reads the optional goal block of the "partie déjà jouée" form.
 *
 * `turns` is not asked for: nobody counts laps after the fact, and it doesn't
 * need to be. It follows from the tiles by the rule the launch funnel applies
 * (the base schedule, plus one lap in every manche after a tile that scores
 * nothing), so it is reconstructed rather than invented.
 */
export function finishedGoals(
  schedule: readonly number[],
  picks: readonly StagePick[],
  catalogue: readonly RoundGoal[],
  playerIds: readonly PlayerId[],
  raw: StageGoalRaw,
): FinishedGoals {
  const stages = stageCalendar(schedule, picks, catalogue);
  const tilesReady = isCalendarReady(stages, catalogue);

  const entered: StageScore[] = [];
  let remaining = 0;

  for (const playerId of playerIds) {
    for (const stage of stages) {
      const text = raw[playerId]?.[stageKey(stage.stage)] ?? "";
      const points = Number.parseInt(text, 10);

      if (text === "" || !Number.isFinite(points)) {
        remaining += 1;
        continue;
      }

      entered.push({ stage: stage.stage, playerId, points });
    }
  }

  // `isCalendarReady` already refuses an empty calendar, so a game with no
  // stages at all can never read as complete.
  const complete = tilesReady && remaining === 0;

  return {
    stages,
    tilesReady,
    scores: complete ? entered : [],
    complete,
    remaining,
  };
}
