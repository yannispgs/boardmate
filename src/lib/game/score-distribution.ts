/**
 * Score distribution: bins the final scores collected across a game's parties
 * into a small histogram with "nice" (1 / 2 / 5 ×10ⁿ) bucket widths, so the
 * spread of points a game tends to produce is readable at a glance regardless
 * of its scale (Catan ~10, Cascadia ~100). Scores are point totals (integers),
 * so bucket widths are kept ≥ 1.
 */

export interface ScoreBin {
  /** Inclusive lower bound. */
  start: number;
  /** Exclusive upper bound (`start + width`). */
  end: number;
  count: number;
}

export interface ScoreHistogram {
  bins: ScoreBin[];
  /** Bucket width (shared by every bin). */
  step: number;
  /** Total number of scores. */
  count: number;
  min: number;
  max: number;
  mean: number;
}

/** Rounds a rough width up to the nearest 1 / 2 / 5 × 10ⁿ. */
function niceStep(rough: number): number {
  const pow = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / pow;
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;

  return factor * pow;
}

/**
 * Builds a histogram of `scores` into at most ~`maxBins` buckets, or `null`
 * when there are no scores. Bins tile `[floor(min/step)·step, …]` and every
 * score lands in exactly one.
 */
export function scoreHistogram(
  scores: number[],
  maxBins = 10,
): ScoreHistogram | null {
  if (scores.length === 0) {
    return null;
  }

  let min = scores[0];
  let max = scores[0];
  let sum = 0;

  for (const s of scores) {
    if (s < min) {
      min = s;
    }
    if (s > max) {
      max = s;
    }
    sum += s;
  }

  const mean = sum / scores.length;
  const range = max - min;
  const step = range === 0 ? 1 : Math.max(1, niceStep(range / maxBins));
  const start = Math.floor(min / step) * step;
  const binCount = Math.floor((max - start) / step) + 1;

  const bins: ScoreBin[] = Array.from({ length: binCount }, (_, i) => ({
    start: start + i * step,
    end: start + (i + 1) * step,
    count: 0,
  }));

  for (const s of scores) {
    const idx = Math.min(binCount - 1, Math.floor((s - start) / step));
    bins[idx].count += 1;
  }

  return { bins, step, count: scores.length, min, max, mean };
}
