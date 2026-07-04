import { describe, expect, it } from "vitest";

import type { PlayerId, ScoreEvent } from "@/lib/domain";

import { buildScoreSeries } from "./score-series";

const p = (n: string) => n as PlayerId;
const ev = (
  playerId: string,
  score: number,
  round: number,
  at: string,
): ScoreEvent => ({ playerId: p(playerId), score, round, at });

describe("buildScoreSeries", () => {
  it("is empty with no events", () => {
    expect(buildScoreSeries([], [p("a")], 10)).toEqual({
      series: [],
      maxScore: 0,
    });
  });

  it("builds a step polyline per player, keyed on the tour", () => {
    const events = [
      ev("a", 1, 2, "t0"),
      ev("b", 1, 3, "t1"),
      ev("a", 2, 5, "t2"),
      ev("a", 3, 8, "t3"),
    ];

    const { series, maxScore } = buildScoreSeries(events, [p("a"), p("b")], 10);

    expect(maxScore).toBe(3);

    // a: 0 → (t2) 1 → (t5) 2 → (t8) 3, each held then jumped (step), to the end.
    const a = series.find(s => s.playerId === "a");
    expect(a?.points).toEqual([
      { x: 0, score: 0 },
      { x: 0.2, score: 0 },
      { x: 0.2, score: 1 },
      { x: 0.5, score: 1 }, // plateau: held 1 from t2 to t5 (stagnation)
      { x: 0.5, score: 2 },
      { x: 0.8, score: 2 },
      { x: 0.8, score: 3 },
      { x: 1, score: 3 },
    ]);

    // b scored once at t3; holds 1 to the right edge.
    const b = series.find(s => s.playerId === "b");
    expect(b?.points).toEqual([
      { x: 0, score: 0 },
      { x: 0.3, score: 0 },
      { x: 0.3, score: 1 },
      { x: 1, score: 1 },
    ]);
  });

  it("keeps a scoreless player flat at 0", () => {
    const { series } = buildScoreSeries(
      [ev("a", 5, 2, "t0")],
      [p("a"), p("b")],
      10,
    );
    const b = series.find(s => s.playerId === "b");

    expect(b?.points.every(pt => pt.score === 0)).toBe(true);
  });

  it("clamps a tour beyond the total to the right edge", () => {
    const { series } = buildScoreSeries([ev("a", 4, 12, "t0")], [p("a")], 10);
    const a = series.find(s => s.playerId === "a");

    // round 12 > 10 total → x clamped to 1.
    expect(a?.points).toEqual([
      { x: 0, score: 0 },
      { x: 1, score: 0 },
      { x: 1, score: 4 },
      { x: 1, score: 4 },
    ]);
  });
});
