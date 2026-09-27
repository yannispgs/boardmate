/** The bar's thickness, matched to the win-rate bar it sits under. */
const TRACK: Readonly<Record<"regular" | "thin", string>> = {
  regular: "h-1.5 bg-black/10 dark:bg-white/10",
  thin: "h-1 bg-black/[0.06] dark:bg-white/10",
};

/**
 * The fill's colour along the placement: green for a player who finishes near
 * the top, yellow around the middle of the table, red near the bottom — a hue
 * slid from 120° to 0°, so every step in between gets its own shade.
 */
function fillColour(position: number): string {
  return `hsl(${Math.round(120 * (1 - position / 100))} 70% 45%)`;
}

/**
 * Where a player tends to finish, as a second bar under a win rate — on a
 * game's player list and on a player's own per-game record alike.
 *
 * No figure and no title: a 0–100 index read as a score whichever way it ran,
 * and « position moyenne » said nothing a reader could use. The two ends are
 * named instead — « dernier » on the left, « premier » on the right — so the
 * bar grows the same way as the win rate above it, longer is better. A faint
 * tick marks the middle of the table, and the colour says at a glance which
 * half the player lives in.
 */
export function PositionBar({
  position,
  size,
}: Readonly<{
  /** 0 = always first, 100 = always last; null when no party ranked him. */
  position: number | null;
  size: "regular" | "thin";
}>) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>dernier</span>
        {position === null ? <span>non classé</span> : null}
        <span>premier</span>
      </div>
      <div
        data-testid="position-bar"
        className={`relative overflow-hidden rounded-full ${TRACK[size]}`}
      >
        {position === null ? null : (
          <div
            className="h-full rounded-full"
            style={{
              width: `${100 - position}%`,
              backgroundColor: fillColour(position),
            }}
          />
        )}
        <div className="absolute inset-y-0 left-1/2 w-px bg-black/25 dark:bg-white/30" />
      </div>
    </div>
  );
}
