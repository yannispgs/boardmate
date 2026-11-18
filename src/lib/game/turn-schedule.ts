import type {
  ConfigValues,
  FieldSpec,
  GameId,
  TurnSchedule,
} from "@/lib/domain";
import { resolveNumber } from "./config-value";

/** Config-field keys carrying the turn-time schedule. */
export const TURN_SCHEDULE_KEYS = {
  base: "turnBaseS",
  step: "turnStepS",
  max: "turnMaxS",
} as const;

/**
 * Used when a boardgame declares no schedule at all: a constant 60 s timer
 * (the historical behaviour). The high cap is inert while `step` is 0.
 */
const FALLBACK: TurnSchedule = { baseS: 60, stepS: 0, maxS: 600 };

/**
 * Resolves the turn-time schedule from the game's effective config values,
 * falling back to the config template defaults and finally a constant 60 s.
 */
export function turnScheduleFrom(
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
): TurnSchedule {
  return {
    baseS: resolveNumber(
      TURN_SCHEDULE_KEYS.base,
      configValues,
      templateFields,
      FALLBACK.baseS,
    ),
    stepS: resolveNumber(
      TURN_SCHEDULE_KEYS.step,
      configValues,
      templateFields,
      FALLBACK.stepS,
    ),
    maxS: resolveNumber(
      TURN_SCHEDULE_KEYS.max,
      configValues,
      templateFields,
      FALLBACK.maxS,
    ),
  };
}

/**
 * The turn duration (seconds) for a given round: `base + step × (round − 1)`,
 * capped at `max` and floored at 1 s. Round is 1-based.
 */
export function turnDurationForRound(
  schedule: TurnSchedule,
  round: number,
): number {
  const r = Math.max(1, round);
  const grown = schedule.baseS + schedule.stepS * (r - 1);

  return Math.max(1, Math.round(Math.min(grown, schedule.maxS)));
}

/**
 * Whether the turns last the same all game long — the schedule then is one
 * length, and the timer's settings are that length alone.
 */
export function isFixedSchedule(schedule: TurnSchedule): boolean {
  return schedule.stepS === 0;
}

/**
 * A fixed schedule of `seconds` a turn. The cap follows: a turn longer than the
 * cap it inherited would otherwise be cut back to it.
 */
export function fixedSchedule(seconds: number): TurnSchedule {
  return { baseS: seconds, stepS: 0, maxS: seconds };
}

/**
 * What is wrong with a schedule typed by hand, or `null` when nothing is: whole
 * seconds, a first turn of one at least, a step that never shrinks the turns,
 * and a cap no shorter than the first turn.
 */
export function scheduleError(schedule: TurnSchedule): string | null {
  const { baseS, stepS, maxS } = schedule;

  if (![baseS, stepS, maxS].every(Number.isInteger)) {
    return "Des secondes entières, s'il te plaît.";
  }

  if (baseS < 1) {
    return "Un tour dure au moins 1 seconde.";
  }

  if (stepS < 0) {
    return "L'ajout par manche ne peut pas être négatif.";
  }

  if (maxS < baseS) {
    return "Le plafond ne peut pas être plus court que la 1ʳᵉ manche.";
  }

  return null;
}

/**
 * Where a party's own timer settings are kept on the phone that set them: per
 * party, so another party never inherits them.
 */
export function scheduleStorageKey(gameId: GameId): string {
  return `boardmate.timer.${gameId}`;
}

/**
 * The settings read back from the phone, or `null` for anything that is not a
 * schedule a turn can be timed on — absent, unreadable, or not valid any more.
 */
export function readStoredSchedule(raw: string | null): TurnSchedule | null {
  if (raw === null) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as Partial<TurnSchedule> | null;
    const schedule = {
      baseS: Number(value?.baseS),
      stepS: Number(value?.stepS),
      maxS: Number(value?.maxS),
    };

    return scheduleError(schedule) === null ? schedule : null;
  } catch {
    return null;
  }
}
