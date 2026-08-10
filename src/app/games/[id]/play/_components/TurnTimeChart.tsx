import type { PlayerId } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import type { PlayerTimeSeries } from "@/lib/game/turn-time-series";

/** One stable colour per seat, cycled if there are more players than colours. */
const COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#0ea5e9",
  "#8b5cf6",
];
const W = 320;
const H = 160;
const TOP = 10;
const BOTTOM = 22; // room for the tour labels
const LEFT = 34; // room for the time labels
const RIGHT = 10;
const PLOT_W = W - LEFT - RIGHT;
const PLOT_H = H - TOP - BOTTOM;
const MAX_X_TICKS = 8;

/** Nearest "nice" step (1 / 2 / 5 × 10ⁿ) at or above `rough`, for axis ticks. */
function niceStep(rough: number): number {
  if (rough <= 0) {
    return 1;
  }

  const pow = 10 ** Math.floor(Math.log10(rough));
  const n = rough / pow;
  const base = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;

  return base * pow;
}

/**
 * Each player's active time per tour, one line each, over the game's tours — so
 * you can see who dragged early vs late. Time (m:ss) runs up the left, tours
 * along the bottom. Plain SVG, matching the app's other hand-rolled charts.
 */
export function TurnTimeChart({
  series,
  maxSeconds,
  maxTour,
  players,
}: Readonly<{
  series: PlayerTimeSeries[];
  maxSeconds: number;
  maxTour: number;
  players: { id: PlayerId; name: string }[];
}>) {
  const colorOf = (playerId: PlayerId) => {
    const idx = players.findIndex(p => p.id === playerId);

    return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
  };

  const yStep = niceStep(maxSeconds / 4);
  const chartMax = Math.ceil(maxSeconds / yStep) * yStep;
  const px = (tour: number) =>
    LEFT + (maxTour <= 1 ? 0.5 : (tour - 1) / (maxTour - 1)) * PLOT_W;
  const py = (seconds: number) => H - BOTTOM - (seconds / chartMax) * PLOT_H;

  const yTicks: number[] = [];
  for (let t = 0; t <= chartMax; t += yStep) {
    yTicks.push(t);
  }

  // Up to 8 evenly-spaced tour ticks (1 … maxTour).
  const xStep = Math.max(1, Math.ceil(maxTour / MAX_X_TICKS));
  const xTicks: number[] = [];
  for (let t = 1; t <= maxTour; t += xStep) {
    xTicks.push(t);
  }

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border border-black/10 dark:border-white/10"
        role="img"
        aria-label="Évolution du temps par tour"
      >
        {/* Horizontal time guides + left-axis labels. */}
        {yTicks.map(t => (
          <g key={`y-${t}`}>
            <line
              x1={LEFT}
              y1={py(t)}
              x2={W - RIGHT}
              y2={py(t)}
              className="stroke-black/10 dark:stroke-white/15"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={LEFT - 5}
              y={py(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={9}
              className="fill-zinc-400"
            >
              {formatDuration(t)}
            </text>
          </g>
        ))}

        {/* Tour labels along the bottom. */}
        {xTicks.map(t => (
          <text
            key={`x-${t}`}
            x={px(t)}
            y={H - 7}
            textAnchor="middle"
            fontSize={9}
            className="fill-zinc-400"
          >
            {t}
          </text>
        ))}

        {series.map(s => (
          <polyline
            key={s.playerId}
            fill="none"
            stroke={colorOf(s.playerId)}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.points
              .map(pt => `${px(pt.tour)},${py(pt.seconds)}`)
              .join(" ")}
          />
        ))}
      </svg>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        {players.map(p => (
          <li key={p.id} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: colorOf(p.id) }}
            />
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
