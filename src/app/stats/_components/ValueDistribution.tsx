"use client";

import { useMemo, useState } from "react";

import {
  dotPlot,
  meanOffset,
  type ScoreHistogram,
  scoreHistogram,
} from "@/lib/game/score-distribution";
import { ScoreDotPlot } from "./ScoreDotPlot";

const TRACK = 96; // px for the tallest bar
const STUB = 4; // min height so empty buckets stay visible

/**
 * Histogram bars: one per bucket, height ∝ how many scores fell in it, with a
 * dashed vertical marker at the mean score (labelled with its value).
 */
function HistogramBars({ histogram }: Readonly<{ histogram: ScoreHistogram }>) {
  const maxCount = Math.max(1, ...histogram.bins.map(b => b.count));
  const meanLeft = meanOffset(histogram) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative flex items-end justify-between gap-1">
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
            </div>
          );
        })}

        {/* Mean marker: a dashed line through the bars with the value on top. */}
        <div
          className="pointer-events-none absolute inset-y-0 flex flex-col items-center"
          style={{ left: `${meanLeft}%`, transform: "translateX(-50%)" }}
        >
          <span className="rounded bg-rose-500 px-1 text-[10px] font-semibold leading-tight text-white tabular-nums dark:bg-rose-400 dark:text-zinc-900">
            {histogram.mean.toFixed(0)}
          </span>
          <span className="w-0 flex-1 border-l border-dashed border-rose-500 dark:border-rose-400" />
        </div>
      </div>

      <div className="flex justify-between gap-1">
        {histogram.bins.map(bin => (
          <span
            key={bin.start}
            className="flex-1 text-center text-[10px] font-medium text-zinc-500 tabular-nums dark:text-zinc-400"
          >
            {bin.start}
          </span>
        ))}
      </div>
    </div>
  );
}

type View = "hist" | "dots";

/** How a distribution names what it counted, so the caption says it out loud. */
export interface DistributionUnit {
  /** One measured value, singular: « score », « partie ». */
  noun: string;
  /**
   * What the figures themselves are, when the numbers alone say nothing:
   * « de 7 à 15 **tours** ». Left out for scores, where points are implied.
   */
  scale?: string;
}

const SCORES: DistributionUnit = { noun: "score" };

/**
 * The distribution of one figure a game produced, over the parties in scope —
 * the final scores, or the laps a party took on a game that is raced rather
 * than out-scored. Toggles between a bucketed **histogram** (the shape) and a
 * **dot plot** (every result, no bucketing — better when the values span a wide
 * range like Forêt Mixte's 100–300). Renders nothing when there is nothing to
 * plot.
 */
export function ValueDistribution({
  values,
  unit = SCORES,
}: Readonly<{ values: number[]; unit?: DistributionUnit }>) {
  const [view, setView] = useState<View>("hist");
  const histogram = useMemo(() => scoreHistogram(values), [values]);
  const plot = useMemo(() => dotPlot(values), [values]);

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
        {histogram.count} {unit.noun}
        {histogram.count > 1 ? "s" : ""} · de {histogram.min} à {histogram.max}
        {unit.scale === undefined ? "" : ` ${unit.scale}`} · moyenne{" "}
        {histogram.mean.toFixed(1)}
        {view === "hist" && histogram.step > 1
          ? ` · tranches de ${histogram.step}`
          : ""}
      </p>
    </div>
  );
}
