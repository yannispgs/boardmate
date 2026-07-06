import type { DiceSpec } from "@/lib/domain";

/**
 * Every value the dice can sum to, low → high: `count`..`count * sides`
 * (Catan's 2×d6 → 2..12).
 */
export function diceValues({ count, sides }: DiceSpec): number[] {
  const out: number[] = [];
  for (let v = count; v <= count * sides; v++) {
    out.push(v);
  }

  return out;
}

/** Per-value roll stats. `currentDrought`/`longestDrought` are counted in rolls. */
export interface DiceValueStat {
  value: number;
  /** How many times this value has been rolled. */
  count: number;
  /** Rolls since it last came up (0 = the most recent roll; all rolls if never). */
  currentDrought: number;
  /** Longest run of consecutive rolls without it (before, between, or since). */
  longestDrought: number;
}

/**
 * Turns the ordered roll sequence into per-value stats. Droughts are measured
 * in number of rolls — the gap before the first occurrence, between occurrences,
 * and since the last one (the current drought). A value never rolled has both
 * droughts equal to the total number of rolls.
 */
export function diceStats(
  rolls: number[],
  values: number[],
): Record<number, DiceValueStat> {
  const n = rolls.length;
  const out: Record<number, DiceValueStat> = {};

  for (const value of values) {
    const positions: number[] = [];
    rolls.forEach((r, i) => {
      if (r === value) {
        positions.push(i);
      }
    });

    if (positions.length === 0) {
      out[value] = {
        value,
        count: 0,
        currentDrought: n,
        longestDrought: n,
      };
      continue;
    }

    // Leading gap (rolls before the first occurrence), then between-gaps.
    let longest = positions[0];
    for (let k = 1; k < positions.length; k++) {
      longest = Math.max(longest, positions[k] - positions[k - 1] - 1);
    }
    const currentDrought = n - 1 - positions[positions.length - 1];
    longest = Math.max(longest, currentDrought);

    out[value] = {
      value,
      count: positions.length,
      currentDrought,
      longestDrought: longest,
    };
  }

  return out;
}

/**
 * How many of the `sides ** count` equally-likely die-face combinations sum to
 * each value — the shape of the distribution (Catan's 2×d6: 1 way to make 2, 6
 * ways to make 7, 1 way to make 12). Built by convolving one die at a time.
 */
export function diceWeights({
  count,
  sides,
}: DiceSpec): Record<number, number> {
  let dist: Record<number, number> = { 0: 1 };

  for (let d = 0; d < count; d++) {
    const next: Record<number, number> = {};
    for (const sumStr of Object.keys(dist)) {
      const sum = Number(sumStr);
      for (let face = 1; face <= sides; face++) {
        next[sum + face] = (next[sum + face] ?? 0) + dist[sum];
      }
    }
    dist = next;
  }

  return dist;
}

/** Whether a value came up more/less than probability predicts (±10% = even). */
export type DiceLuck = "over" | "under" | "even";

/** Observed vs. expected occurrences of a value, given the rolls so far. */
export interface DiceDeviation {
  value: number;
  /** Times actually rolled. */
  count: number;
  /** Times expected from its probability × the number of rolls. */
  expected: number;
  /** `count - expected` (positive = luckier than the odds). */
  delta: number;
  luck: DiceLuck;
}

/**
 * Compares each value's observed count against what its probability predicts
 * over the same number of rolls. A value within ±10% of its expected count reads
 * as `"even"`; beyond that it's `"over"` (came up more than the odds) or
 * `"under"`. With no rolls everything is even (expected 0).
 */
export function diceDeviations(
  rolls: number[],
  spec: DiceSpec,
): DiceDeviation[] {
  const weights = diceWeights(spec);
  const total = spec.sides ** spec.count;
  const n = rolls.length;

  const counts: Record<number, number> = {};
  for (const r of rolls) {
    counts[r] = (counts[r] ?? 0) + 1;
  }

  return diceValues(spec).map(value => {
    const count = counts[value] ?? 0;
    const expected = (weights[value] / total) * n;
    const delta = count - expected;

    let luck: DiceLuck = "even";
    if (expected > 0 && Math.abs(delta) > 0.1 * expected) {
      luck = delta > 0 ? "over" : "under";
    }

    return { value, count, expected, delta, luck };
  });
}
