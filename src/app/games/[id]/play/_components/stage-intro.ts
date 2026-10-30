/**
 * The line read out above a manche's points: the goal tile, when the calendar
 * names one (Wingspan), or the rule the points follow (Odin).
 */

/** Wingspan: the tile read out, when the calendar names one. */
export function goalIntro(goalLabel: string): string {
  return goalLabel === ""
    ? "Points marqués par chacun sur l'objectif."
    : `Objectif : ${goalLabel}. Points marqués par chacun.`;
}

/** Odin: the rule the boxes are filled in by, capped when the rules cap it. */
export function pointsIntro(maxPoints: number | null): string {
  const rule = "Points de chacun : 0 pour celui qui termine, au moins 1 pour";

  return maxPoints === null
    ? `${rule} les autres.`
    : `${rule} les autres, ${maxPoints} au plus.`;
}
