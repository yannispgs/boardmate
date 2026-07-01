import { BAR_W, BOT, SVG_H, TOP } from "./geometry";

/**
 * The full-height "Tour N" divider that travels just before each round's opening
 * player. It fades out (via the caller's `faded`) once that round has begun.
 */
export function RoundBar({
  round,
  left,
  faded,
}: {
  round: number;
  left: number;
  faded: boolean;
}) {
  return (
    <div
      className="absolute top-0 transition-opacity duration-500"
      style={{ left, width: BAR_W, height: SVG_H, opacity: faded ? 0 : 1 }}
    >
      <span
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        style={{ top: -1 }}
      >
        Tour {round}
      </span>
      <span
        className="absolute left-0 rounded-full bg-black/40 dark:bg-white/45"
        style={{ top: TOP, width: BAR_W, height: BOT - TOP }}
      />
    </div>
  );
}
