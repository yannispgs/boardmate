import type { DotPlot } from "@/lib/game/score-distribution";

const WIDTH = 320; // viewBox width (scales to the container via w-full)
const PAD = 8;
const DOT = 7; // dot diameter
const GAP = 2; // vertical gap between stacked dots
const AXIS_H = 18; // room under the baseline for tick labels

/**
 * A dot plot of a game's scores: each result is a dot placed by its value and
 * stacked on the ones sharing its spot, so busy score ranges rise as taller
 * columns. The axis auto-fits min→max, so it reads the same whether scores run
 * 2–12 or 100–300 — no bucketing.
 */
export function ScoreDotPlot({ plot }: { plot: DotPlot }) {
  const stack = DOT + GAP;
  const plotH = Math.max(1, plot.maxStack) * stack;
  const height = plotH + AXIS_H;
  const inner = WIDTH - PAD * 2;
  const colX = (col: number) => PAD + (col / (plot.columns - 1)) * inner;
  const mid = Math.round((plot.min + plot.max) / 2);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Nuage de points des scores"
    >
      {plot.points.map(p => (
        <circle
          key={`${p.col}-${p.row}`}
          cx={colX(p.col)}
          cy={plotH - p.row * stack - DOT / 2}
          r={DOT / 2}
          className="fill-indigo-500"
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
        {plot.min}
      </text>
      <text
        x={WIDTH / 2}
        y={height - 4}
        textAnchor="middle"
        className="fill-zinc-500 text-[10px] tabular-nums"
      >
        {mid}
      </text>
      <text
        x={WIDTH - PAD}
        y={height - 4}
        textAnchor="end"
        className="fill-zinc-500 text-[10px] tabular-nums"
      >
        {plot.max}
      </text>
    </svg>
  );
}
