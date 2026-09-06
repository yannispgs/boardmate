import type { Spread } from "@/lib/game/recap-spread";

/**
 * The drawing is in viewBox units, and the box is **wider than the space it is
 * given**: 320 units land on about 190 px between the two end labels on a
 * phone, so every figure below is worth roughly **0.59 px** on the glass.
 *
 * That ratio is the thing to hold in mind when touching these. A radius of 2.5
 * — which reads as a comfortable dot in the source — is a 3 px speck once
 * drawn, and it was too small to find on the track.
 */
const WIDTH = 320; // viewBox width (scales to the container via w-full)
const HEIGHT = 14;
const PAD = 5; // room for the cursor at either end, so it is never clipped
const MARK = 3.5; // radius of a past party — 4.2 px on the glass

/**
 * One measure's spread on a single line: a track running from the measure's
 * poor end to its good one, a grey dot for each party already played, and a
 * cursor on the one just played.
 *
 * Which figure sits at which end is {@link Spread}'s business, not this
 * component's — it draws left to right and asks nothing about what it means.
 *
 * It replaces a dot plot in a modal. The plot said more — how many parties
 * shared a figure, since the dots stacked — but it said it a tap away and one
 * player at a time. At the end of a six-handed game the question is « où je me
 * situe », and that answer belongs on the line, not behind a press.
 *
 * Parties that land close together overlap here rather than stacking. That is
 * the price of the line: the bar is read for where the cursor sits among the
 * others, not for the shape of the crowd.
 */
export function SpreadBar({
  bar,
  label,
}: Readonly<{
  bar: Spread;
  /** What the bar is, for the reader who cannot see it. */
  label: string;
}>) {
  const mid = HEIGHT / 2;
  const inner = WIDTH - PAD * 2;
  const x = (t: number) => {
    return PAD + t * inner;
  };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      // Height follows the width so the dots stay round and the cursor keeps
      // its corners — stretching one axis alone turns both into ellipses.
      className="h-auto w-full"
      role="img"
      aria-label={label}
    >
      <line
        x1={PAD}
        y1={mid}
        x2={WIDTH - PAD}
        y2={mid}
        strokeWidth={2}
        strokeLinecap="round"
        className="stroke-black/10 dark:stroke-white/15"
      />

      {/* One path for every past party rather than one circle each. Two
          parties on the same figure land on the same spot, so as elements they
          would have nothing to be told apart by; as a single path they are just
          ink. A zero-length subpath under a round cap is drawn as a disc — the
          spec's own way of writing a dot. */}
      {/* Grey on the dark reading is one step lighter than the instinct: this
          bar lives on a screen that paints itself dark, where a colour taken
          down to sit behind the cursor simply stops being there. A dot has to
          be findable on its own — it is the one that says where the player's
          other parties fell — so it is lit to about the weight of the two end
          labels, and told apart from the cursor by its colour, not by being
          faint. */}
      <path
        d={bar.marks.map(t => `M${x(t)} ${mid}h0`).join("")}
        strokeWidth={MARK * 2}
        strokeLinecap="round"
        className="stroke-zinc-300 dark:stroke-zinc-500"
      />

      {/* The party just played, and the only mark the reader actually looks
          for — so it is the widest thing on the line and the brightest, which
          it was neither of: 3 units of an indigo pitched for a white page came
          out as the faintest stroke of the whole bar on this one. */}
      <rect
        x={x(bar.cursor) - 2}
        y={0}
        width={4}
        height={HEIGHT}
        rx={2}
        className="fill-indigo-500 dark:fill-indigo-400"
      />
    </svg>
  );
}
