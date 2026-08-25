import type { SessionPlayerStat } from "@/lib/game/session-stats";

/**
 * One player's evening: what they played, what they won, and the two averages
 * that say how — the score they post per party and where they finish.
 *
 * Averages, never totals: a dozen deals added up would crown somebody the
 * sitting never agreed to crown, and an average still reads right for a player
 * who sat down halfway through.
 */
export function SessionPlayerCard({
  stat,
}: Readonly<{ stat: SessionPlayerStat }>) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
      <span className="min-w-0 flex-1 truncate text-sm">{stat.name}</span>

      <Figure label="parties" value={String(stat.games)} />
      <Figure label="🏆" value={String(stat.wins)} strong={stat.wins > 0} />
      <Figure label="pts moy." value={oneDecimal(stat.avgScore)} />
      <Figure label="place moy." value={oneDecimal(stat.avgPlace)} />
    </li>
  );
}

/** One figure of the row, with the word that says what it counts under it. */
function Figure({
  label,
  value,
  strong = false,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <span className="flex w-14 shrink-0 flex-col items-end">
      <span className={`text-sm tabular-nums ${strong ? "font-semibold" : ""}`}>
        {value}
      </span>
      <span className="text-[0.65rem] text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
    </span>
  );
}

/**
 * A mean to one decimal — enough to tell a 2.0 from a 2.5 over four deals, and
 * a dash when there is no mean to show rather than a 0 that reads as a result.
 */
function oneDecimal(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return value.toFixed(1);
}
