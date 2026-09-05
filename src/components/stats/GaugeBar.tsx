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
 * Empty means this evening sat below everything the table had done on this game,
 * full means above it — both ends are records rather than the two values any
 * scale gives away. A party with nothing to compare against gets no bar at all —
 * see {@link ../../lib/game/party-gauge.gauge}.
 *
 * ⚠️ The 2 px radius costs ink and is kept anyway (owner, 2026-09-05). However
 * the scale falls, at least one tick sits against an end, and a track that clips
 * its contents rounds that tick's outer corners off — about a ninth of a 2 px
 * mark. Measured rather than guessed, and judged small enough to trade for a bar
 * that doesn't look cheap. What it is **not** allowed to grow into: a cap of
 * half the height, which eats an end tick outright.
 *
 * ⚠️ A tick is 2 px of ink that has to read over the painted fill as well as
 * over the bare track, and half the ticks that matter are the ones the fill has
 * run past. Anything lighter than this went invisible on indigo, and it is also
 * what pays for the corners above (owner, 2026-09-05).
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

          Inset by its own width: the scale is stretched to hold this party, so
          one of its two ends is always a past party, and that tick would be
          drawn half outside the bar. */}
      {ticks.map(t => (
        <span
          key={t}
          className="absolute inset-y-0 bg-black/70 dark:bg-white/90"
          style={{ left: `calc(${t * 100}% - ${t * TICK}px)`, width: TICK }}
        />
      ))}
    </div>
  );
}
