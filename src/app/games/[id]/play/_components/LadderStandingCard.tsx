import type { LadderStanding } from "@/lib/game/ladder";
import { workingRung } from "@/lib/game/ladder";

/**
 * One player in the standings of a laddered game (Phase 10): where he sits, the
 * phase he is working on — the figure that decides the game — then what the
 * manche cost him and his points so far.
 */
export function LadderStandingCard({
  name,
  standing,
  rungLabel,
  top,
  showPoints,
}: Readonly<{
  name: string;
  standing: LadderStanding;
  /** What one rung is called (« Phase »). */
  rungLabel: string;
  /** The top rung: clearing it is what wins. */
  top: number;
  /** Whether to show what this manche cost — the recap does, the board doesn't. */
  showPoints: boolean;
}>) {
  const done = standing.rungs >= top;

  return (
    <li
      data-testid="ladder-standing"
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        done
          ? "border-emerald-500 bg-emerald-500/5"
          : "border-black/10 dark:border-white/10"
      }`}
    >
      <span className="w-5 shrink-0 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
        {standing.rank}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>

      <span className="shrink-0 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
        {done
          ? `${rungLabel} ${top} ✓`
          : `${rungLabel} ${workingRung(standing.rungs, top)}`}
      </span>

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
