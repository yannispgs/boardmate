import type { PlayerId } from "@/lib/domain";
import type { PlayerSeries } from "@/lib/game/score-series";

/** One stable colour per seat, cycled if there are more players than colours. */
const COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#0ea5e9",
  "#8b5cf6",
];
/** The objective line's colour (yellow). */
const TARGET = "#eab308";
const W = 320;
const H = 160;
const TOP = 10;
const BOTTOM = 22; // room for the x-axis (tour) labels
const LEFT = 22; // room for the y-axis point labels
const RIGHT = 18; // room for the trophy at the end of the objective line

/** At most this many evenly-spaced tour ticks on the x-axis. */
const MAX_X_TICKS = 8;

/**
 * The score evolution as one line per player over the course of the game. A
 * points scale runs up the left (dashed guide every 2 pts); the objective is a
 * yellow line capped with a trophy. The x-axis is the game's tours, split into
 * up to 8 evenly-spaced ticks (e.g. a 40-tour game → one every 5). Plain SVG,
 * no chart dependency.
 */
export function ScoreChart({
  series,
  maxScore,
  threshold,
  rounds,
  players,
}: {
  series: PlayerSeries[];
  maxScore: number;
  threshold: number | null;
  /** Total tours (rounds) the game lasted — the x-axis span. */
  rounds: number;
  players: { id: PlayerId; name: string }[];
}) {
  const colorOf = (playerId: PlayerId) => {
    const idx = players.findIndex(p => p.id === playerId);

    return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
  };

  // Round the top up to an even number so the 2-point guides land exactly.
  const chartMax = Math.max(
    2,
    Math.ceil(Math.max(maxScore, threshold ?? 0) / 2) * 2,
  );
  const px = (x: number) => LEFT + x * (W - LEFT - RIGHT);
  const py = (score: number) =>
    H - BOTTOM - (score / chartMax) * (H - TOP - BOTTOM);

  const guides: number[] = [];
  for (let g = 0; g <= chartMax; g += 2) {
    guides.push(g);
  }

  // Evenly-spaced tour ticks (constant gap = rounds / ticks), the last at the
  // right edge = end of game. Labelled with the tour number.
  const tickCount = Math.min(MAX_X_TICKS, rounds);
  const xTicks: { x: number; tour: number }[] = [];
  for (let i = 1; i <= tickCount; i++) {
    const fraction = i / tickCount;
    xTicks.push({ x: px(fraction), tour: Math.round(rounds * fraction) });
  }

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border border-black/10 dark:border-white/10"
        role="img"
        aria-label="Évolution du score au fil de la partie"
      >
        {/* Dashed horizontal guide + point label every 2 points. */}
        {guides.map(g => (
          <g key={`y-${g}`}>
            <line
              x1={LEFT}
              y1={py(g)}
              x2={W - RIGHT}
              y2={py(g)}
              className="stroke-black/10 dark:stroke-white/15"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={LEFT - 5}
              y={py(g)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={9}
              className="fill-zinc-400"
            >
              {g}
            </text>
          </g>
        ))}

        {/* Vertical tour bars + x-axis labels. */}
        {xTicks.map(t => (
          <g key={`x-${t.tour}`}>
            <line
              x1={t.x}
              y1={py(chartMax)}
              x2={t.x}
              y2={py(0)}
              className="stroke-black/10 dark:stroke-white/15"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={t.x}
              y={H - 7}
              textAnchor="middle"
              fontSize={9}
              className="fill-zinc-400"
            >
              {t.tour}
            </text>
          </g>
        ))}

        {/* Objective line (yellow), capped with a trophy at its end. */}
        {threshold !== null ? (
          <>
            <line
              x1={LEFT}
              y1={py(threshold)}
              x2={W - RIGHT}
              y2={py(threshold)}
              stroke={TARGET}
              strokeWidth={2}
            />
            <text
              x={W - RIGHT + 2}
              y={py(threshold)}
              dominantBaseline="middle"
              fontSize={13}
            >
              🏆
            </text>
          </>
        ) : null}

        {series.map(s => (
          <polyline
            key={s.playerId}
            fill="none"
            stroke={colorOf(s.playerId)}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.points.map(pt => `${px(pt.x)},${py(pt.score)}`).join(" ")}
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
