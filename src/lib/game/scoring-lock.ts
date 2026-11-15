/**
 * How long the phone counting the points keeps the form to itself before
 * another may take it over. A phone that dies mid-count would otherwise hold
 * the party forever; ten minutes is longer than any count the table has made.
 *
 * ⚠️ The database enforces the same delay (`claim_scoring`): this one only says
 * when the screen offers the take-over.
 */
export const SCORING_TAKE_OVER_MINUTES = 10;

/** When another phone may take over a score form held since `lockedAt`. */
export function scoringTakeOverAt(lockedAt: Date): Date {
  return new Date(lockedAt.getTime() + SCORING_TAKE_OVER_MINUTES * 60_000);
}
