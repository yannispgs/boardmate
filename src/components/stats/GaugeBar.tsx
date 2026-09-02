import type { Gauge } from "@/lib/game/party-gauge";

/** How wide a past party's tick is, in px — kept here because the inset needs it. */
const TICK = 2;

/**
 * One figure's level among the parties before it: a bar filled from the left,
 * with a tick for each past party along the same scale.
 *
 * Drawn in real pixels rather than in an SVG viewBox on purpose. Its sibling
 * {@link ./SpreadBar.SpreadBar} draws 320 units into about 190 px, so every size
 * written there has to be thought of times 0.59 — a trap that cost that bar its
 * legibility once already. Here a tick is 2 px because it is 2 px.
 *
 * Square-ended rather than rounded, which a bar this short would normally be:
 * a 4 px cap on an 8 px bar eats the ticks at both ends, and those two are
 * exactly the parties that set the scale. Straight ends also give the fill a
 * clean edge to be read against the ticks it stops short of.
 *
 * Empty means this evening sat below everything the table had done on this game,
 * full means above it: the scale is set by the past alone, so both ends are
 * records rather than the two values any scale gives away. A party with nothing
 * to compare against gets no bar at all — see {@link ../../lib/game/party-gauge.gauge}.
 */
export function GaugeBar({ gauge }: Readonly<{ gauge: Gauge }>) {
  // Two parties that landed on the same figure land on the same offset, and one
  // tick drawn twice is one tick. Collapsing them is what lets a tick be keyed
  // by where it is rather than by its rank in the list.
  const ticks = [...new Set(gauge.marks)];

  return (
    <div className="relative mt-1 h-2 w-full overflow-hidden rounded-sm bg-black/10 dark:bg-white/10">
      <div
        data-testid="gauge-fill"
        className="h-full bg-indigo-500 dark:bg-indigo-400"
        style={{ width: `${gauge.fill * 100}%` }}
      />

      {/* The past parties, on the same scale. One tick per party rather than a
          count anywhere: what the reader is after is whether the fill stops
          short of a crowd, which is a shape and not a number.

          Inset by its own width so the two that set the scale — there is always
          one at each end — are drawn inside the bar instead of half outside it. */}
      {ticks.map(t => (
        <span
          key={t}
          className="absolute inset-y-0 bg-black/40 dark:bg-white/50"
          style={{ left: `calc(${t * 100}% - ${t * TICK}px)`, width: TICK }}
        />
      ))}
    </div>
  );
}
