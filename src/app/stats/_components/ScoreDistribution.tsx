"use client";

import { useMemo, useState } from "react";

import {
  dotPlot,
  type ScoreHistogram,
  scoreHistogram,
} from "@/lib/game/score-distribution";
import { ScoreDotPlot } from "./ScoreDotPlot";

const TRACK = 96; // px for the tallest bar
const STUB = 4; // min height so empty buckets stay visible

/** Histogram bars: one per bucket, height ∝ how many scores fell in it. */
function HistogramBars({ histogram }: { histogram: ScoreHistogram }) {
  const maxCount = Math.max(1, ...histogram.bins.map(b => b.count));

  return (
    <div className="flex items-end justify-between gap-1">
      {histogram.bins.map(bin => {
        const height = STUB + (bin.count / maxCount) * (TRACK - STUB);

        return (
          <div
            key={bin.start}
            className="flex flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-[10px] text-zinc-400 tabular-nums leading-none">
              {bin.count || ""}
            </span>
            <span
              className="w-full rounded-t bg-indigo-500"
              style={{ height }}
            />
            <span className="text-[10px] font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
              {bin.start}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type View = "hist" | "dots";

/**
 * The distribution of the final scores a game produced, over the parties in
 * scope. Toggles between a bucketed **histogram** (the shape) and a **dot
 * plot** (every result, no bucketing — better when scores span a wide range
 * like Forêt Mixte's 100–300). Renders nothing when there are no scores.
 */
export function ScoreDistribution({ scores }: { scores: number[] }) {
  const [view, setView] = useState<View>("hist");
  const histogram = useMemo(() => scoreHistogram(scores), [scores]);
  const plot = useMemo(() => dotPlot(scores), [scores]);

  if (histogram === null || plot === null) {
    return null;
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-2.5 py-1 transition ${
      active
        ? "bg-indigo-600 text-white"
        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
    }`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 self-end rounded-lg border border-black/10 p-0.5 text-xs font-medium dark:border-white/10">
        <button
          type="button"
          onClick={() => setView("hist")}
          className={tabClass(view === "hist")}
        >
          Histogramme
        </button>
        <button
          type="button"
          onClick={() => setView("dots")}
          className={tabClass(view === "dots")}
        >
          Nuage de points
        </button>
      </div>

      {view === "hist" ? (
        <HistogramBars histogram={histogram} />
      ) : (
        <ScoreDotPlot plot={plot} />
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {histogram.count} score{histogram.count > 1 ? "s" : ""} · de{" "}
        {histogram.min} à {histogram.max} · moyenne {histogram.mean.toFixed(1)}
        {view === "hist" && histogram.step > 1
          ? ` · tranches de ${histogram.step}`
          : ""}
      </p>
    </div>
  );
}
