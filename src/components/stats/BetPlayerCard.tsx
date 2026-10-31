import type { BetPlayerStat } from "@/lib/game/bet-stats";

/** « 75 % » — a rate as the cards read it. */
export function percent(rate: number): string {
  return `${Math.round(rate * 100)} %`;
}

/**
 * One player's way of betting (Luz): how often the bets came off — the bar —
 * how often they took the safety token, by how much a missed bet usually
 * missed, and the profile all of it adds up to.
 */
export function BetPlayerCard({
  stat,
  rank,
  hedgeLabel,
}: Readonly<{
  stat: BetPlayerStat;
  rank: number;
  /** What the hedge is called (« Jeton Sécurité »). */
  hedgeLabel: string;
}>) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          <span className="text-xs text-zinc-400 tabular-nums">{rank}.</span>
          <span className="truncate">{stat.name}</span>
        </span>
        <span className="shrink-0 text-sm tabular-nums">
          <span className="font-semibold">{percent(stat.successRate)}</span>{" "}
          <span className="text-zinc-500 dark:text-zinc-400">de réussite</span>
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${stat.successRate * 100}%` }}
        />
      </div>

      <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        {stat.won} pari{stat.won > 1 ? "s" : ""} réussi
        {stat.won > 1 ? "s" : ""} sur {stat.bets} · {hedgeLabel.toLowerCase()}{" "}
        {stat.hedges} fois
        {stat.avgMissGap === null
          ? ""
          : ` · raté de ${stat.avgMissGap.toFixed(1)} pli${
              stat.avgMissGap > 1 ? "s" : ""
            } en moyenne`}
      </p>
      <p className="text-xs font-medium">{stat.profile}</p>
    </li>
  );
}
