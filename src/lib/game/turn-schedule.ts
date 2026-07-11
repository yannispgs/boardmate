import type { ConfigValues, FieldSpec, TurnSchedule } from "@/lib/domain";

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

/** A number from the config value, else the template default, else `fallback`. */
function resolveNumber(
  key: string,
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
  fallback: number,
): number {
  const fromConfig = configValues?.[key];
  if (typeof fromConfig === "number") {
    return fromConfig;
  }

  const spec = templateFields.find(f => f.key === key);
  const def =
    spec && "default" in spec
      ? (spec as { default?: unknown }).default
      : undefined;

  return typeof def === "number" ? def : fallback;
}

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
