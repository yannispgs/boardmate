import { describe, expect, it } from "vitest";

import type { PlayerId, ScoreEvent } from "@/lib/domain";

import { buildScoreSeries } from "./score-series";

const p = (n: string) => n as PlayerId;
const ev = (playerId: string, score: number, at: string): ScoreEvent => ({
  playerId: p(playerId),
  score,
  at,
});

describe("buildScoreSeries", () => {
  it("is empty with no events", () => {
    expect(buildScoreSeries([], [p("a")])).toEqual({ series: [], maxScore: 0 });
  });

  it("builds a polyline per player, starting at 0 and holding the last score", () => {
    const events = [
      ev("a", 1, "t0"),
      ev("b", 1, "t1"),
      ev("a", 2, "t2"),
      ev("a", 3, "t3"),
    ];

    const { series, maxScore } = buildScoreSeries(events, [p("a"), p("b")]);

    expect(maxScore).toBe(3);

    const a = series.find(s => s.playerId === "a");
    expect(a?.points[0]).toEqual({ x: 0, score: 0 });
    // a scored at global indices 0, 2, 3 (of 4 → lastIndex 3).
    expect(a?.points.map(pt => pt.score)).toEqual([0, 1, 2, 3]);
    expect(a?.points.at(-1)).toEqual({ x: 1, score: 3 });

    // b scored once (index 1); its line holds 1 to the right edge.
    const b = series.find(s => s.playerId === "b");
    expect(b?.points.map(pt => pt.score)).toEqual([0, 1, 1]);
    expect(b?.points.at(-1)?.x).toBe(1);
  });

  it("keeps a scoreless player flat at 0", () => {
    const { series } = buildScoreSeries([ev("a", 5, "t0")], [p("a"), p("b")]);
    const b = series.find(s => s.playerId === "b");

    expect(b?.points.every(pt => pt.score === 0)).toBe(true);
  });

  it("places a single event at the right edge", () => {
    const { series } = buildScoreSeries([ev("a", 4, "t0")], [p("a")]);
    const a = series.find(s => s.playerId === "a");

    expect(a?.points).toEqual([
      { x: 0, score: 0 },
      { x: 1, score: 4 },
    ]);
  });
});
