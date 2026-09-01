import type { Spread } from "@/lib/game/recap-spread";

const WIDTH = 320; // viewBox width (scales to the container via w-full)
const HEIGHT = 14;
const PAD = 5; // room for the cursor at either end, so it is never clipped
const MARK = 2.5; // radius of a past evening

/**
 * One measure's spread on a single line: a track running from the smallest
 * figure to the largest, a grey dot for each evening already played, and a
 * cursor on tonight's.
 *
 * It replaces a dot plot in a modal. The plot said more — how many evenings
 * shared a figure, since the dots stacked — but it said it a tap away and one
 * player at a time. At the end of a six-handed game the question is « où je me
 * situe », and that answer belongs on the line, not behind a press.
 *
 * Evenings that land close together overlap here rather than stacking. That is
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

      {bar.marks.map((t, i) => (
        <circle
          // Two evenings on the same figure sit at the same spot, so the index
          // is the only thing telling them apart.
          // biome-ignore lint/suspicious/noArrayIndexKey: values repeat.
          key={i}
          cx={x(t)}
          cy={mid}
          r={MARK}
          className="fill-zinc-300 dark:fill-zinc-600"
        />
      ))}

      <rect
        x={x(bar.cursor) - 1.5}
        y={0}
        width={3}
        height={HEIGHT}
        rx={1.5}
        className="fill-indigo-500"
      />
    </svg>
  );
}
