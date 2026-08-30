import type { MeasureKey } from "@/lib/game/player-recap";
import { dotPlot } from "@/lib/game/score-distribution";

import { measureValue } from "./recap-measure";

const WIDTH = 320; // viewBox width (scales to the container via w-full)
const PAD = 10;
const DOT = 8; // dot diameter
const GAP = 2; // vertical gap between stacked dots
const AXIS_H = 18; // room under the baseline for the end labels

/**
 * One measure's spread: a dot per evening, placed by its value and stacked on
 * the ones sharing its spot, with **tonight** picked out in indigo among the
 * grey of the evenings before.
 *
 * It is the plot the statistics screens use, not a chart of its own — the
 * difference is that here the reader is looking for a single dot, so the cloud
 * behind it is deliberately dimmed rather than coloured.
 */
export function RecapDotPlot({
  measureKey,
  value,
  past,
}: Readonly<{ measureKey: MeasureKey; value: number; past: number[] }>) {
  const plot = dotPlot([...past, value]);

  if (plot === null) {
    return null;
  }

  const stack = DOT + GAP;
  const plotH = Math.max(1, plot.maxStack) * stack;
  const height = plotH + AXIS_H;
  const inner = WIDTH - PAD * 2;
  const colX = (col: number) => {
    return PAD + (col / (plot.columns - 1)) * inner;
  };
  // Tonight is one of the dots carrying its value. Which one, when an earlier
  // evening landed on the same figure, cannot be told apart and does not need
  // to be: equal values share a column, so any of them points at the same spot.
  const tonight = plot.points.find(p => p.value === value);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Répartition — ${measureValue(measureKey, value)}`}
    >
      {plot.points.map(p => (
        <circle
          key={`${p.col}-${p.row}`}
          cx={colX(p.col)}
          cy={plotH - p.row * stack - DOT / 2}
          r={DOT / 2}
          className={
            p === tonight
              ? "fill-indigo-500"
              : "fill-zinc-300 dark:fill-zinc-600"
          }
        />
      ))}

      <line
        x1={PAD}
        y1={plotH}
        x2={WIDTH - PAD}
        y2={plotH}
        className="stroke-black/15 dark:stroke-white/15"
      />

      <text
        x={PAD}
        y={height - 4}
        className="fill-zinc-500 text-[10px] tabular-nums"
      >
        {measureValue(measureKey, plot.min)}
      </text>
      <text
        x={WIDTH - PAD}
        y={height - 4}
        textAnchor="end"
        className="fill-zinc-500 text-[10px] tabular-nums"
      >
        {measureValue(measureKey, plot.max)}
      </text>
    </svg>
  );
}
