import type { DiceSpec } from "@/lib/domain";
import { type DiceLuck, diceDeviations, diceValues } from "@/lib/game/dice";

const LUCK_CLASS: Record<DiceLuck, string> = {
  over: "text-emerald-600 dark:text-emerald-400",
  under: "text-red-600 dark:text-red-400",
  even: "text-zinc-400",
};

// Fixed spacing per roll so a long game (Catan can reach ~100 rolls) stays
// legible and scrolls horizontally rather than cramming marks together. Kept
// tight — consecutive marks sit about one tick-width apart (ticks are 2px).
const PX_PER_ROLL = 4;
const MIN_LANE = 140;

/** Signed écart with a real minus sign, one decimal (e.g. `+2.5`, `−1.0`). */
function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "−";

  return `${sign}${Math.abs(delta).toFixed(1)}`;
}

/** A "nice" roll-number step (5 / 10 / 20 / 50 …) giving ~5 axis labels. */
function axisStep(n: number): number {
  const rough = n / 5;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const base = rough / pow;
  const nice = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;

  return Math.max(5, nice * pow);
}

/**
 * The dice log the way you'd tally it on paper: one row per value (2…12), each
 * roll a vertical tick placed left → right in draw order along that value's
 * lane. A row shows at a glance how often a value came up, the gaps between its
 * occurrences, and when they clustered. The value (left) and the total + écart
 * (right) stay pinned while the lanes scroll horizontally, so a long game stays
 * readable. The écart is vs the count its probability predicts — green past +1σ,
 * red past −1σ, grey within (normal variance). A faint roll-count scale runs
 * underneath.
 */
export function DiceTimeline({
  rolls,
  spec,
}: {
  rolls: number[];
  spec: DiceSpec;
}) {
  const values = diceValues(spec);
  const byValue = new Map(diceDeviations(rolls, spec).map(d => [d.value, d]));
  const n = rolls.length;

  const pct = (index: number) => (n <= 1 ? 50 : (index / (n - 1)) * 100);
  const laneMin = Math.max(MIN_LANE, (n - 1) * PX_PER_ROLL);

  // Vertical guides + labels every "nice" number of rolls (1-based roll number).
  const step = axisStep(n);
  const ticks: number[] = [];
  for (let r = step; r <= n; r += step) {
    ticks.push(r);
  }

  const sticky = "sticky bg-white dark:bg-zinc-900";

  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
      <ul
        aria-label="Tirages de dés dans l'ordre"
        className="flex flex-col p-1"
      >
        {values.map(value => {
          const d = byValue.get(value);
          const positions: number[] = [];
          rolls.forEach((r, i) => {
            if (r === value) {
              positions.push(i);
            }
          });

          return (
            <li key={value} className="flex h-5 items-stretch">
              <span
                className={`${sticky} left-0 z-10 flex w-6 shrink-0 items-center justify-end pr-1 text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400`}
              >
                {value}
              </span>
              <div className="relative flex-1" style={{ minWidth: laneMin }}>
                <div className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2 rounded bg-black/[0.03] dark:bg-white/[0.04]" />
                {ticks.map(r => (
                  <div
                    key={r}
                    className="absolute top-0.5 bottom-0.5 w-px bg-black/[0.06] dark:bg-white/[0.08]"
                    style={{ left: `${pct(r - 1)}%` }}
                  />
                ))}
                {positions.map(i => (
                  <div
                    key={i}
                    className="absolute top-1 bottom-1 w-0.5 -translate-x-1/2 rounded-sm bg-sky-500"
                    style={{ left: `${pct(i)}%` }}
                  />
                ))}
              </div>
              <span
                className={`${sticky} right-0 z-10 flex w-[4.25rem] shrink-0 items-center justify-end gap-1.5 pl-1 text-xs tabular-nums`}
              >
                <span>{d?.count ?? 0}×</span>
                <span
                  className={`font-medium ${LUCK_CLASS[d?.luck ?? "even"]}`}
                >
                  {formatDelta(d?.delta ?? 0)}
                </span>
              </span>
            </li>
          );
        })}

        {ticks.length > 0 ? (
          <li className="flex h-4 items-start" aria-hidden>
            <span className={`${sticky} left-0 z-10 w-6 shrink-0`} />
            <div className="relative flex-1" style={{ minWidth: laneMin }}>
              {ticks.map(r => (
                <span
                  key={r}
                  className="absolute -translate-x-1/2 text-[9px] tabular-nums text-zinc-400"
                  style={{ left: `${pct(r - 1)}%` }}
                >
                  {r}
                </span>
              ))}
            </div>
            <span className={`${sticky} right-0 z-10 w-[4.25rem] shrink-0`} />
          </li>
        ) : null}
      </ul>
    </div>
  );
}
