/** The mantissa an axis label reads well on, for a value normalized to [1, 10). */
function niceBase(normalized: number): number {
  if (normalized <= 1) {
    return 1;
  }

  if (normalized <= 2) {
    return 2;
  }

  if (normalized <= 5) {
    return 5;
  }

  return 10;
}

/**
 * Rounds `rough` up to the nearest "nice" step — 1, 2 or 5 × 10ⁿ — which is
 * what every chart in the app spaces its axis ticks by. A non-positive input
 * has no order of magnitude to round to, so it falls back to 1.
 */
export function niceStep(rough: number): number {
  if (rough <= 0) {
    return 1;
  }

  const pow = 10 ** Math.floor(Math.log10(rough));

  return niceBase(rough / pow) * pow;
}
