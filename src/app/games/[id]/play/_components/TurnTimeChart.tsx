import type { PlayerId } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import { niceStep } from "@/lib/game/nice-step";
import { playerColorOf } from "@/lib/game/player-colors";
import type { PlayerTimeSeries } from "@/lib/game/turn-time-series";

const W = 320;
const H = 160;
const TOP = 10;
const BOTTOM = 22; // room for the round labels
const LEFT = 34; // room for the time labels
const RIGHT = 10;
const PLOT_W = W - LEFT - RIGHT;
const PLOT_H = H - TOP - BOTTOM;
const MAX_X_TICKS = 8;

/**
 * Each player's average turn per round, one line each, over the game's rounds —
 * so you can see who dragged early vs late. Time (m:ss) runs up the left, rounds
 * along the bottom. Plain SVG, matching the app's other hand-rolled charts.
 *
 * Each point is marked, not just joined: a player who sat out a generation, or a
 * game only a few rounds long, otherwise leaves a bare segment with nothing to
 * say where the readings actually were.
 */
export function TurnTimeChart({
  series,
  maxSeconds,
  maxRound,
  players,
  label,
}: Readonly<{
  series: PlayerTimeSeries[];
  maxSeconds: number;
  maxRound: number;
  players: { id: PlayerId; name: string }[];
  /** What the chart is called, so the picture and its heading agree. */
  label: string;
}>) {
  const colorOf = (playerId: PlayerId) => playerColorOf(players, playerId);

  const yStep = niceStep(maxSeconds / 4);
  const chartMax = Math.ceil(maxSeconds / yStep) * yStep;
  const px = (round: number) =>
    LEFT + (maxRound <= 1 ? 0.5 : (round - 1) / (maxRound - 1)) * PLOT_W;
  const py = (seconds: number) => H - BOTTOM - (seconds / chartMax) * PLOT_H;

  const yTicks: number[] = [];
  for (let t = 0; t <= chartMax; t += yStep) {
    yTicks.push(t);
  }

  // Up to 8 evenly-spaced round ticks (1 … maxRound).
  const xStep = Math.max(1, Math.ceil(maxRound / MAX_X_TICKS));
  const xTicks: number[] = [];
  for (let t = 1; t <= maxRound; t += xStep) {
    xTicks.push(t);
  }

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border border-black/10 dark:border-white/10"
        role="img"
        aria-label={label}
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

        {/* Round labels along the bottom. */}
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
          <g key={s.playerId}>
            <polyline
              fill="none"
              stroke={colorOf(s.playerId)}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.points
                .map(pt => `${px(pt.round)},${py(pt.seconds)}`)
                .join(" ")}
            />

            {s.points.map(pt => (
              <circle
                key={pt.round}
                cx={px(pt.round)}
                cy={py(pt.seconds)}
                r={2.5}
                fill={colorOf(s.playerId)}
              />
            ))}
          </g>
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
