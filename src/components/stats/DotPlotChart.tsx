import type { DotPlot, DotPlotPoint } from "@/lib/game/score-distribution";

const WIDTH = 320; // viewBox width (scales to the container via w-full)
const PAD = 8;
const DOT = 7; // dot diameter
const GAP = 2; // vertical gap between stacked dots
const AXIS_H = 18; // room under the baseline for tick labels

/** One end (or the middle) of the axis, under the baseline. */
function AxisLabel({
  x,
  y,
  anchor,
  text,
}: Readonly<{
  x: number;
  y: number;
  anchor?: "middle" | "end";
  text: string;
}>) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className="fill-zinc-500 text-[10px] tabular-nums"
    >
      {text}
    </text>
  );
}

/**
 * A dot plot: each value is a dot placed by its figure and stacked on the ones
 * sharing its spot, so busy ranges rise as taller columns. The axis auto-fits
 * min→max, so it reads the same whether the values run 2–12 or 100–300 — no
 * bucketing.
 *
 * Two readings share it. Left alone, every dot is coloured and the whole cloud
 * is the subject: that is a game's scores. Given a `highlight`, the cloud dims
 * to grey and the dot carrying that value keeps the colour: the reader is then
 * looking for one evening among his own, and the rest is context.
 */
export function DotPlotChart({
  plot,
  label,
  format = String,
  highlight,
  midTick = false,
}: Readonly<{
  plot: DotPlot;
  /** What the plot is, for the reader who cannot see it. */
  label: string;
  /** How a value is spoken on the axis — plain digits unless said otherwise. */
  format?: (value: number) => string;
  /** The one value to pick out; every other dot then goes grey. */
  highlight?: number;
  /** Whether the axis also names its midpoint — a wide cloud reads better. */
  midTick?: boolean;
}>) {
  const stack = DOT + GAP;
  const plotH = Math.max(1, plot.maxStack) * stack;
  const height = plotH + AXIS_H;
  const inner = WIDTH - PAD * 2;
  const colX = (col: number) => {
    return PAD + (col / (plot.columns - 1)) * inner;
  };
  // Which dot carries the highlighted value, when a value is highlighted at
  // all. Two evenings landing on the same figure share a column, so picking
  // either of them points at the same spot on screen.
  const picked = plot.points.find(p => p.value === highlight);

  const dotClass = (point: DotPlotPoint) => {
    if (highlight === undefined || point === picked) {
      return "fill-indigo-500";
    }

    return "fill-zinc-300 dark:fill-zinc-600";
  };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={label}
    >
      {plot.points.map(p => (
        <circle
          key={`${p.col}-${p.row}`}
          cx={colX(p.col)}
          cy={plotH - p.row * stack - DOT / 2}
          r={DOT / 2}
          className={dotClass(p)}
        />
      ))}

      <line
        x1={PAD}
        y1={plotH}
        x2={WIDTH - PAD}
        y2={plotH}
        className="stroke-black/15 dark:stroke-white/15"
      />

      <AxisLabel x={PAD} y={height - 4} text={format(plot.min)} />

      {midTick ? (
        <AxisLabel
          x={WIDTH / 2}
          y={height - 4}
          anchor="middle"
          text={format(Math.round((plot.min + plot.max) / 2))}
        />
      ) : null}

      <AxisLabel
        x={WIDTH - PAD}
        y={height - 4}
        anchor="end"
        text={format(plot.max)}
      />
    </svg>
  );
}
