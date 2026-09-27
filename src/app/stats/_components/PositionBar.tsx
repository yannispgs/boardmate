/** The bar's thickness, matched to the win-rate bar it sits under. */
const TRACK: Readonly<Record<"regular" | "thin", string>> = {
  regular: "h-1.5 bg-black/10 dark:bg-white/10",
  thin: "h-1 bg-black/[0.06] dark:bg-white/10",
};

/**
 * Where a player tends to finish, as a second bar under a win rate — on a
 * game's player list and on a player's own per-game record alike.
 *
 * The figure keeps the app's scale — 0 = always first, the way « position
 * moyenne » reads on the seat and neighbour statistics — but the bar is drawn
 * full for the best placed, so the two bars read the same way: longer is
 * better. The caption says which end of the figure is the good one.
 */
export function PositionBar({
  position,
  size,
}: Readonly<{
  /** 0–100, or null when no party ranked the player. */
  position: number | null;
  size: "regular" | "thin";
}>) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>Position moyenne · 0 = toujours 1er</span>
        <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {position === null ? "—" : Math.round(position)}
        </span>
      </div>
      <div className={`overflow-hidden rounded-full ${TRACK[size]}`}>
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${position === null ? 0 : 100 - position}%` }}
        />
      </div>
    </div>
  );
}
