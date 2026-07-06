const W = 320;
const H = 180;
const TOP = 10;
const BOTTOM = 22; // room for the roll-order labels
const LEFT = 24; // room for the value labels
const RIGHT = 10;
const PLOT_W = W - LEFT - RIGHT;
const PLOT_H = H - TOP - BOTTOM;
const MAX_X_TICKS = 8;

/**
 * The dice rolls in the order they came up — draw number along the bottom, the
 * summed value up the left (Catan: 2…12). One bar per roll, its top sitting on
 * the value that came up, so the sequence reads left to right and a value's
 * height jumps out. Plain SVG, like the app's other hand-rolled charts.
 */
export function DiceTimeline({
  rolls,
  values,
}: {
  rolls: number[];
  values: number[];
}) {
  const minV = values[0];
  const maxV = values[values.length - 1];
  // Floor the bars just below the lowest possible sum so even a min roll shows.
  const floor = minV - 1;
  const span = Math.max(1, maxV - floor);
  const n = rolls.length;

  const py = (value: number) => TOP + ((maxV - value) / span) * PLOT_H;
  const baseline = py(floor);

  const slot = PLOT_W / Math.max(1, n);
  const barW = Math.max(1, Math.min(slot - 1, 14));
  const cx = (i: number) => LEFT + (i + 0.5) * slot;

  // Up to 8 evenly-spaced draw-number ticks (1 … n).
  const xStep = Math.max(1, Math.ceil(n / MAX_X_TICKS));
  const xTicks: number[] = [];
  for (let t = 1; t <= n; t += xStep) {
    xTicks.push(t);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-xl border border-black/10 dark:border-white/10"
      role="img"
      aria-label="Tirages de dés dans l'ordre"
    >
      {/* One faint guide + label per possible value. */}
      {values.map(value => (
        <g key={`y-${value}`}>
          <line
            x1={LEFT}
            y1={py(value)}
            x2={W - RIGHT}
            y2={py(value)}
            className="stroke-black/[0.06] dark:stroke-white/[0.08]"
            strokeWidth={1}
          />
          <text
            x={LEFT - 5}
            y={py(value)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={9}
            className="fill-zinc-400 tabular-nums"
          >
            {value}
          </text>
        </g>
      ))}

      {/* Draw-number labels along the bottom. */}
      {xTicks.map(t => (
        <text
          key={`x-${t}`}
          x={cx(t - 1)}
          y={H - 7}
          textAnchor="middle"
          fontSize={9}
          className="fill-zinc-400 tabular-nums"
        >
          {t}
        </text>
      ))}

      {/* One standalone bar per roll — not joined, so each occurrence stands. */}
      {rolls.map((v, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: rolls are an ordered log, index IS the identity
          key={i}
          x={cx(i) - barW / 2}
          y={py(v)}
          width={barW}
          height={baseline - py(v)}
          rx={Math.min(1.5, barW / 2)}
          className="fill-sky-500"
        />
      ))}
    </svg>
  );
}
