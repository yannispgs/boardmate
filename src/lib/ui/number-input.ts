/**
 * Reading what someone types into a number box, as they type it.
 *
 * Kept out of the box itself so the two rules that matter are stated once and
 * tested: only digits ever land in it, and a box left half-typed is worth
 * nothing rather than NaN.
 */

/**
 * Whole and never negative — a phone's numeric keyboard still offers a comma
 * and a minus sign, and neither has any meaning in a count.
 */
export function digitsOnly(text: string): string {
  return text.replace(/\D/g, "");
}

/** What an emptied or half-typed box is worth: nothing, never NaN. */
export function numberOf(text: string): number {
  const parsed = Number.parseInt(text, 10);

  return Number.isFinite(parsed) ? parsed : 0;
}
