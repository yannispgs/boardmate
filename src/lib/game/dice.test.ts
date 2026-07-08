import { describe, expect, it } from "vitest";

import { diceDeviations, diceStats, diceValues, diceWeights } from "./dice";

describe("diceValues", () => {
  it("enumerates count..count*sides", () => {
    expect(diceValues({ count: 2, sides: 6 })).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(diceValues({ count: 1, sides: 6 })).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("diceStats", () => {
  it("counts occurrences and current/longest droughts", () => {
    // sequence: 7 8 7 5 7 — value 7 appears at 0,2,4; 8 once; 5 once.
    const rolls = [7, 8, 7, 5, 7];
    const s = diceStats(rolls, [5, 7, 8]);

    // 7: 3 times, last is the most recent roll → current drought 0; gaps
    // between (1,1) and leading (0) → longest 1.
    expect(s[7]).toEqual({
      value: 7,
      count: 3,
      currentDrought: 0,
      longestDrought: 1,
    });
    // 8: once at index 1 → current drought = 5-1-1 = 3; longest = max(leading 1,
    // trailing 3) = 3.
    expect(s[8]).toEqual({
      value: 8,
      count: 1,
      currentDrought: 3,
      longestDrought: 3,
    });
    // 5: once at index 3 → current drought = 5-1-3 = 1.
    expect(s[5]).toEqual({
      value: 5,
      count: 1,
      currentDrought: 1,
      longestDrought: 3,
    });
  });

  it("treats a never-rolled value as drought = total rolls", () => {
    const s = diceStats([7, 7, 7], [2, 7]);

    expect(s[2]).toEqual({
      value: 2,
      count: 0,
      currentDrought: 3,
      longestDrought: 3,
    });
    expect(s[7].count).toBe(3);
    expect(s[7].currentDrought).toBe(0);
  });

  it("handles no rolls yet", () => {
    const s = diceStats([], [2, 3]);

    expect(s[2]).toEqual({
      value: 2,
      count: 0,
      currentDrought: 0,
      longestDrought: 0,
    });
  });
});

describe("diceWeights", () => {
  it("gives the 2d6 combination counts (1..6..1, summing to 36)", () => {
    const w = diceWeights({ count: 2, sides: 6 });

    expect(w[2]).toBe(1);
    expect(w[7]).toBe(6);
    expect(w[12]).toBe(1);

    const total = Object.values(w).reduce((a, b) => a + b, 0);

    expect(total).toBe(36);
  });

  it("gives a flat distribution for a single die", () => {
    expect(diceWeights({ count: 1, sides: 6 })).toEqual({
      1: 1,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
      6: 1,
    });
  });
});

describe("diceDeviations", () => {
  const spec = { count: 2, sides: 6 } as const;

  it("flags values beyond one standard deviation as over / under", () => {
    // A perfectly flat spread: each of the 11 values 3× → 33 rolls. 7 is the
    // likeliest (expected 5.5, σ ≈ 2.14) so 3 (Δ −2.5) is under; 2 is rarest
    // (expected 0.92, σ ≈ 0.94) so 3 (Δ +2.08) is over.
    const rolls: number[] = [];
    for (let v = 2; v <= 12; v++) {
      rolls.push(v, v, v);
    }

    const dev = diceDeviations(rolls, spec);
    const byValue = Object.fromEntries(dev.map(d => [d.value, d]));

    expect(byValue[7].count).toBe(3);
    expect(byValue[7].expected).toBeCloseTo(5.5);
    expect(byValue[7].delta).toBeCloseTo(-2.5);
    expect(byValue[7].luck).toBe("under");

    expect(byValue[2].expected).toBeCloseTo(33 / 36);
    expect(byValue[2].luck).toBe("over");
  });

  it("keeps a count within one σ of expectation even", () => {
    const rolls = Array.from({ length: 36 }, (_, i) => (i % 6) + 4); // 4..9 ×6

    const dev = diceDeviations(rolls, spec);
    const byValue = Object.fromEntries(dev.map(d => [d.value, d]));

    // 7 hits its expectation exactly (6) → even.
    expect(byValue[7].count).toBe(6);
    expect(byValue[7].luck).toBe("even");
    // 6 is one over its expectation (5), well inside σ ≈ 2.08 → still even.
    expect(byValue[6].delta).toBeCloseTo(1);
    expect(byValue[6].luck).toBe("even");
  });

  it("does not flag normal variance on a common value (σ band, not ±10%)", () => {
    // 36 rolls (4..9 ×6) plus two extra 7s → 38 rolls, 7 rolled 8×.
    const rolls = [...Array.from({ length: 36 }, (_, i) => (i % 6) + 4), 7, 7];

    const seven = diceDeviations(rolls, spec).find(d => d.value === 7);

    // Δ ≈ +1.67 over expectation 6.33, but σ ≈ 2.30 → even. A flat ±10% band
    // (±0.63) would have wrongly called this "over".
    expect(seven?.count).toBe(8);
    expect(seven?.luck).toBe("even");
  });

  it("treats no rolls as all even (expected 0)", () => {
    const dev = diceDeviations([], spec);

    expect(dev.every(d => d.luck === "even")).toBe(true);
    expect(dev.every(d => d.expected === 0)).toBe(true);
  });
});
