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

/**
 * Where the mean sits along the histogram's value axis, as a 0–1 fraction of
 * the binned range `[first bin start, last bin end]` — for placing a vertical
 * mean marker over the bars. A single bin (every score identical) has no spread,
 * so the marker is centred (`0.5`). Clamped to `[0, 1]`.
 */
export function meanOffset(histogram: ScoreHistogram): number {
  if (histogram.bins.length <= 1) {
    return 0.5;
  }

  const axisStart = histogram.bins[0].start;
  // Bins tile uniformly, so the axis ends `bins·step` past the first start —
  // no need to read the last bin.
  const axisEnd = axisStart + histogram.bins.length * histogram.step;
  const fraction = (histogram.mean - axisStart) / (axisEnd - axisStart);

  return Math.min(1, Math.max(0, fraction));
}

/** One dot in a dot plot: its column (by value) and stack position. */
export interface DotPlotPoint {
  /** Column index, 0..columns-1, mapped from the score's value. */
  col: number;
  /** Stack position within the column (0 = bottom). */
  row: number;
  value: number;
}

export interface DotPlot {
  points: DotPlotPoint[];
  columns: number;
  min: number;
  max: number;
  /** Tallest stack — the number of dots in the busiest column. */
  maxStack: number;
}

/**
 * Lays scores out as a Wilkinson-style dot plot: each score is a dot placed in
 * the column matching its value and stacked on the ones already there, so
 * clusters rise as taller stacks. No bucketing of the values themselves and no
 * randomness — every result is shown and the layout is deterministic (scores
 * are stacked in ascending order). `null` when there are no scores.
 */
export function dotPlot(scores: number[], columns = 24): DotPlot | null {
  if (scores.length === 0) {
    return null;
  }

  let min = scores[0];
  let max = scores[0];

  for (const s of scores) {
    if (s < min) {
      min = s;
    }
    if (s > max) {
      max = s;
    }
  }

  const span = max - min || 1;
  const heights = new Array<number>(columns).fill(0);

  const points = [...scores]
    .sort((a, b) => a - b)
    .map(value => {
      const col = Math.round(((value - min) / span) * (columns - 1));
      const row = heights[col];
      heights[col] += 1;

      return { col, row, value };
    });

  let maxStack = 0;

  for (const h of heights) {
    if (h > maxStack) {
      maxStack = h;
    }
  }

  return { points, columns, min, max, maxStack };
}
