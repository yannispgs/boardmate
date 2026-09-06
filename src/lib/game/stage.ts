/**
 * The calendar of a game played in **scheduled stages** (Wingspan's manches).
 *
 * The other kind of stage, the generation, ends when the last player passes and
 * is therefore unforeseeable (see `./generation`). A scheduled stage is the
 * opposite: it lasts a counted number of laps, everyone plays exactly once per
 * lap, and the whole game is laid out before anybody sits down.
 *
 * Laid out, but not by the box. Wingspan's 8/7/6/5 is only what you get when
 * all four goal tiles score; Oceania's « Pas d'objectif » never spends its
 * action cube, which hands everyone one extra lap in every *following* manche.
 * The calendar is therefore settled once the four tiles are known — at setup —
 * and recorded per game, which is what {@link stageCalendar} computes.
 */

import type {
  ConfigValues,
  FieldSpec,
  GameStage,
  PlayerId,
  RoundGoal,
  RoundGoalParams,
  ScoreSheetItem,
  StageAdvance,
  StageScore,
  StageSpec,
} from "@/lib/domain";

import { resolveNumber } from "./config-value";
import { openingSeat } from "./generation";
import { formatGoalLabel, isGoalComplete } from "./round-goals";
import { derivedKeys } from "./scoring";

/** A goal tile chosen for one stage, before the calendar is worked out. */
export interface StagePick {
  goalKey: string;
  goalParams: RoundGoalParams;
}

/**
 * The calendar of a game: one entry per stage of the base schedule, carrying
 * the tile it is set up with and the laps it ends up lasting.
 *
 * A tile lengthens the stages **after** its own, never its own, so the extra
 * laps accumulate as the schedule is walked. Stages still waiting for a tile
 * are kept in place (empty key, base length) so a half-filled calendar can be
 * previewed while the table is picking.
 */
export function stageCalendar(
  schedule: readonly number[],
  picks: readonly StagePick[],
  catalogue: readonly RoundGoal[],
): GameStage[] {
  const extraOf = new Map(
    catalogue.map(goal => [goal.key, goal.extraTurn ?? 0]),
  );
  let carried = 0;

  return schedule.map((base, index) => {
    const pick = picks[index];
    const stage: GameStage = {
      stage: index + 1,
      goalKey: pick?.goalKey ?? "",
      goalParams: pick?.goalParams ?? {},
      turns: base + carried,
    };

    carried += extraOf.get(stage.goalKey) ?? 0;

    return stage;
  });
}

/** The tile chosen for one stage, or the empty pick before anything is chosen. */
export function pickAt(picks: readonly StagePick[], index: number): StagePick {
  return picks[index] ?? { goalKey: "", goalParams: {} };
}

/**
 * The picks of every stage but this one — what the picker must treat as spent,
 * since a tile is only in the box once.
 */
export function otherPicks(
  picks: readonly StagePick[],
  index: number,
): StagePick[] {
  return picks.filter((_pick, i) => i !== index);
}

/**
 * Whether the calendar is ready to launch a game: every stage has a tile from
 * the catalogue, and every one of that tile's parameters has been answered.
 */
export function isCalendarReady(
  stages: readonly GameStage[],
  catalogue: readonly RoundGoal[],
): boolean {
  if (stages.length === 0) {
    return false;
  }

  return stages.every(stage => {
    const goal = catalogue.find(g => g.key === stage.goalKey);

    return goal !== undefined && isGoalComplete(goal, stage.goalParams);
  });
}

/**
 * Whether a stage's tile is worth anything to anybody.
 *
 * Oceania's « Pas d'objectif » is laid like any other tile and lengthens the
 * manches that follow it, but nothing is scored on it — so there is nothing to
 * ask the table for that manche, and nothing to record but zero. A stage still
 * waiting for its tile — or a game that has no calendar at all — scores until
 * told otherwise.
 */
export function stageScores(
  stage: GameStage | undefined,
  catalogue: readonly RoundGoal[],
): boolean {
  const goal = catalogue.find(g => g.key === stage?.goalKey);

  return goal?.scores ?? true;
}

/**
 * What the other stages already aim at, per parameter key: the habitats, the
 * nest types. Two goals laid on the same game never target the same one, so a
 * value spent here is spent for the whole calendar — whichever family used it.
 */
function targetedValues(taken: readonly StagePick[]): Map<string, Set<string>> {
  const targeted = new Map<string, Set<string>>();

  for (const pick of taken) {
    for (const [key, value] of Object.entries(pick.goalParams)) {
      const values = targeted.get(key) ?? new Set<string>();

      values.add(value);
      targeted.set(key, values);
    }
  }

  return targeted;
}

/**
 * Whether a value can still be aimed at for one of a goal's parameters. « Œufs
 * dans Forêt » on one stage takes the forest off the board for every other
 * goal, « Oiseaux dans Forêt » included — but leaves the sea and the prairie.
 */
export function isParamValueAvailable(
  paramKey: string,
  value: string,
  taken: readonly StagePick[],
): boolean {
  return !targetedValues(taken).get(paramKey)?.has(value);
}

/**
 * Whether a goal can still be laid, given what the other stages took. A tile
 * without a variable part goes down once and is then out of the box; a family
 * stays available as long as each of its parameters has one value left to aim
 * at, since « Œufs dans Mer » and « Œufs dans Forêt » are two tiles.
 */
export function isGoalAvailable(
  goal: RoundGoal,
  taken: readonly StagePick[],
): boolean {
  if (goal.params.length === 0) {
    return !taken.some(pick => pick.goalKey === goal.key);
  }

  const targeted = targetedValues(taken);

  return goal.params.every(param => {
    return param.options.some(option => {
      return !targeted.get(param.key)?.has(option.value);
    });
  });
}

/** How many laps of the table the whole game lasts, calendar in hand. */
export function scheduledRoundLimit(stages: readonly GameStage[]): number {
  return stages.reduce((total, stage) => total + stage.turns, 0);
}

/**
 * Whether a game announces its own stage changes on the play screen.
 *
 * It is worth announcing where the stage turns over while everybody is looking
 * at their cards rather than at the phone: Terraforming Mars, where one player
 * steps out at a time, Wingspan, which runs off a calendar laid out at launch.
 * A manche the table closes **by hand** (Odin, Papayoo) is already announced
 * twice — somebody said it out loud, and its own recap modal follows — so a
 * third announcement would only be a screen to get rid of.
 *
 * It matters beyond the announcement: the games that announce are the ones
 * whose clock waits for the table to acknowledge the change, so the same rule
 * decides who is charged for the seconds in between.
 */
export function announcesStage(stages: StageSpec | null): boolean {
  return stages !== null && stages.advance !== "manual";
}

/** Config-field key carrying how long a stage change waits to be taken. */
export const STAGE_HOLD_KEY = "stageHoldS";

/**
 * How long a game waits, by default, for the table to take the new stage.
 *
 * A minute. It is the ceiling and not the expectation: the card goes as soon as
 * somebody touches it, and this is only how long the app is willing to hold the
 * clock before deciding nobody is going to. Used for a game configured before
 * the field existed, so every party keeps behaving the same way.
 */
export const DEFAULT_STAGE_HOLD_S = 60;

/**
 * The stage-change wait, in seconds, from the game's effective config values,
 * falling back to the config template's default and finally to a minute.
 *
 * There is no way to ask for zero, and that is deliberate: both ends of the
 * range are a bug the app already had. No wait at all charges the first player
 * for the seconds before the table looked up — the thing this whole mechanism
 * exists to stop — and no ceiling at all records him a turn of nothing when
 * nobody taps. The floor is enforced here rather than trusted to the template,
 * which anybody can edit.
 */
export function stageHoldSeconds(
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
): number {
  const seconds = resolveNumber(
    STAGE_HOLD_KEY,
    configValues,
    templateFields,
    DEFAULT_STAGE_HOLD_S,
  );

  return Math.min(300, Math.max(10, Math.round(seconds)));
}

/** Where a lap of the table falls in the calendar. */
export interface StagePosition {
  /** 1-based stage. */
  stage: number;
  /** 1-based lap **within** that stage — it restarts at 1 on each new one. */
  round: number;
}

/**
 * The stage a given lap of the table belongs to, and its rank inside it.
 *
 * The last stage is left open-ended: a lap beyond the calendar reads as one
 * more lap of the final stage rather than as a fifth one. It cannot normally
 * happen — the game ends on the last turn of the last lap — but a calendar that
 * lost its rows must still name the stage being played.
 */
export function stagePosition(
  round: number,
  turnsPerStage: readonly number[],
): StagePosition {
  if (!Number.isInteger(round) || round < 1) {
    throw new Error("round must be a positive integer");
  }

  let remaining = round;

  for (let index = 0; index < turnsPerStage.length - 1; index++) {
    if (remaining <= turnsPerStage[index]) {
      return { stage: index + 1, round: remaining };
    }

    remaining -= turnsPerStage[index];
  }

  return { stage: Math.max(turnsPerStage.length, 1), round: remaining };
}

/**
 * Whether that lap of the table is the last one of its stage — the moment the
 * table scores the goal tile and moves the first-player marker along.
 */
export function isStageEnd(
  round: number,
  turnsPerStage: readonly number[],
): boolean {
  const position = stagePosition(round, turnsPerStage);

  return position.round === turnsPerStage[position.stage - 1];
}

/** Everything a turn of a scheduled game is placed by. */
export interface ScheduledPosition extends StagePosition {
  /** 0-based index into the seat-ordered players. */
  seatIndex: number;
}

/**
 * Stage, lap and active seat for a given global turn number.
 *
 * Seats rotate: the first-player marker moves one seat along at each new stage
 * (`openingSeat`), so the same lap position belongs to a different player from
 * one manche to the next.
 */
export function scheduledPosition(
  turn: number,
  seatCount: number,
  turnsPerStage: readonly number[],
): ScheduledPosition {
  if (!Number.isInteger(turn) || turn < 1) {
    throw new Error("turn must be a positive integer");
  }
  if (!Number.isInteger(seatCount) || seatCount < 1) {
    throw new Error("seatCount must be a positive integer");
  }

  const zero = turn - 1;
  const lap = Math.floor(zero / seatCount) + 1;
  const position = stagePosition(lap, turnsPerStage);
  const opening = openingSeat(position.stage, seatCount);

  return {
    ...position,
    seatIndex: (opening + (zero % seatCount)) % seatCount,
  };
}

/**
 * Whether that global turn is the very last one of its stage — the table has
 * gone round for the last time and the goal tile is about to be scored. The lap
 * closes on its last seat, wherever the first-player marker happens to sit.
 */
export function isLastTurnOfStage(
  turn: number,
  seatCount: number,
  turnsPerStage: readonly number[],
): boolean {
  const at = scheduledPosition(turn, seatCount, turnsPerStage);

  return (
    at.round === turnsPerStage[at.stage - 1] &&
    (turn - 1) % seatCount === seatCount - 1
  );
}

/** The turn a stage closes on, and the stage it closes. */
export interface StageEnd {
  /** Global turn number of the stage's very last turn. */
  turn: number;
  /** 1-based stage that turn closes. */
  stage: number;
}

/**
 * Where the stage a given turn belongs to comes to an end. A calendar is laid
 * out before anybody sits down, so this is plain arithmetic: count the laps up
 * to and including that stage, and take their last seat.
 *
 * A turn past the calendar closes on itself rather than in the past — the last
 * stage is open-ended (see {@link stagePosition}), and a ribbon must not be told
 * a manche ended before the turn being played.
 */
export function stageEndTurn(
  turn: number,
  seatCount: number,
  turnsPerStage: readonly number[],
): StageEnd {
  const at = scheduledPosition(turn, seatCount, turnsPerStage);
  const laps = turnsPerStage
    .slice(0, at.stage)
    .reduce((total, value) => total + value, 0);

  return { turn: Math.max(turn, laps * seatCount), stage: at.stage };
}

/**
 * How a stage's goal reads at the table — « Œufs dans Mer ». Empty when the
 * calendar names a tile the catalogue no longer offers, which reads as no goal
 * rather than as a broken template.
 */
export function stageGoalLabel(
  stage: GameStage | undefined,
  catalogue: readonly RoundGoal[],
): string {
  if (stage === undefined) {
    return "";
  }

  const goal = catalogue.find(g => g.key === stage.goalKey);

  return goal === undefined ? "" : formatGoalLabel(goal, stage.goalParams);
}

/**
 * What each player has scored on the stage goals so far, summed — the final
 * sheet's « Objectifs de manche » line, which is no longer typed at the end
 * because it was entered manche by manche while the birds were on the table.
 */
export function stageGoalTotals(
  scores: readonly StageScore[],
): Record<PlayerId, number> {
  const totals: Record<string, number> = {};

  for (const score of scores) {
    totals[score.playerId] = (totals[score.playerId] ?? 0) + score.points;
  }

  return totals;
}

/**
 * The derived « Objectifs de manche » cells, ready for the end-of-game sheet.
 * Every player gets one, so a table that scored nothing on the goals reads `0`
 * rather than a blank the sheet would keep waiting for. Empty when the sheet
 * carries no such line — nothing was counted during play.
 */
export function stageGoalPrefill(
  sheet: ScoreSheetItem[],
  playerIds: readonly PlayerId[],
  scores: readonly StageScore[],
): Record<string, Record<string, string>> {
  const keys = derivedKeys(sheet, "stageGoals");

  if (keys.length === 0) {
    return {};
  }

  const totals = stageGoalTotals(scores);

  return Object.fromEntries(
    playerIds.map(id => [
      id,
      Object.fromEntries(keys.map(key => [key, String(totals[id] ?? 0)])),
    ]),
  );
}

/** How long a game in progress lasts, and whether it follows a calendar. */
export interface PlayCalendar {
  /** The game follows a calendar, and actually has one recorded. */
  scheduled: boolean;
  /** Laps per stage, in order — empty for a game that follows no calendar. */
  turnsPerStage: number[];
  /** The whole game's length in laps, or null when it is open-ended. */
  roundLimit: number | null;
}

/**
 * What the play screen has to know about a game's length. A calendar overrides
 * the boardgame's own `roundLimit`, since two games out of the same box can run
 * to different lengths — that is the whole point of a per-game calendar.
 *
 * A game that *should* have one but doesn't (its rows never made it) falls back
 * on the box: better an open-ended game than one that can never be ended.
 */
export function playCalendar(
  advance: StageAdvance | undefined,
  stages: readonly GameStage[],
  boardgameRoundLimit: number | null,
): PlayCalendar {
  if (advance !== "schedule" || stages.length === 0) {
    return {
      scheduled: false,
      turnsPerStage: [],
      roundLimit: boardgameRoundLimit,
    };
  }

  return {
    scheduled: true,
    turnsPerStage: stages.map(s => s.turns),
    roundLimit: scheduledRoundLimit(stages),
  };
}
