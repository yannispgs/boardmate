import type { Standing } from "@/lib/game/stage-tally";

/**
 * One player in the standings of a game counted manche by manche: where they
 * sit, what the manche just cost them, and what they are on in total.
 *
 * The rank is spelled out rather than left to the reading order, because in a
 * game the lowest total wins the first line is the one nobody expects to be at
 * the top.
 */
export function StandingCard({
  name,
  standing,
  showPoints,
  atRisk,
}: Readonly<{
  name: string;
  standing: Standing;
  /** Whether to show what this manche cost — the recap does, the board doesn't. */
  showPoints: boolean;
  /** This player's total has reached the target and stops the game. */
  atRisk: boolean;
}>) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        atRisk
          ? "border-rose-400 bg-rose-500/5"
          : "border-black/10 dark:border-white/10"
      }`}
    >
      <span className="w-5 shrink-0 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
        {standing.rank}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>

      {showPoints ? (
        <span className="w-12 shrink-0 text-right text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          {standing.points === null ? "—" : `+${standing.points}`}
        </span>
      ) : null}

      <span className="w-10 shrink-0 text-right font-semibold text-base tabular-nums">
        {standing.total}
      </span>
    </li>
  );
}
