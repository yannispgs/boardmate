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
const W = 320;
const H = 140;
const PAD = 8;

/**
 * The score evolution as one line per player over the course of the game (x =
 * event order). Plain SVG — no chart dependency — matching the app's other
 * hand-rolled visuals. Shows who led early and got caught.
 */
export function ScoreChart({
  series,
  maxScore,
  players,
}: {
  series: PlayerSeries[];
  maxScore: number;
  players: { id: PlayerId; name: string }[];
}) {
  const colorOf = (playerId: PlayerId) => {
    const idx = players.findIndex(p => p.id === playerId);

    return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
  };
  const px = (x: number) => PAD + x * (W - 2 * PAD);
  const py = (score: number) => H - PAD - (score / maxScore) * (H - 2 * PAD);

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border border-black/10 dark:border-white/10"
        role="img"
        aria-label="Évolution du score au fil de la partie"
      >
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          className="stroke-black/10 dark:stroke-white/15"
          strokeWidth={1}
        />
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
