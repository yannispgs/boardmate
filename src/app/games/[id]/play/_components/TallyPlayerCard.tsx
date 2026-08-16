import type { TallyExitLabels } from "@/lib/game/tally-labels";
import type { TallyPlayerStat } from "@/lib/game/tally-stats";

/**
 * One player's manches: how often they took no point, and what the rest cost
 * them. The bar is their share of the game's manches, so the lines compare at a
 * glance — the whole table's bars add up to a full one when a single player can
 * close a manche.
 */
export function TallyPlayerCard({
  stat,
  labels,
  rank,
  stageCount,
  isWinner,
}: Readonly<{
  stat: TallyPlayerStat;
  labels: TallyExitLabels;
  rank: number;
  /** Manches the game lasted — the shared scale of every bar. */
  stageCount: number;
  isWinner: boolean;
}>) {
  const width = stageCount > 0 ? (stat.exits / stageCount) * 100 : 0;

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="text-xs text-zinc-400 tabular-nums">{rank}.</span>
          {stat.name}
          {isWinner ? (
            <span role="img" aria-label="Vainqueur">
              🏆
            </span>
          ) : null}
        </span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{stat.exits}</span>{" "}
          <span className="text-zinc-500 dark:text-zinc-400">
            {stat.exits > 1 ? labels.events : labels.event}
          </span>
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${width}%` }}
        />
      </div>

      <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        {stat.avgCaught === null
          ? labels.always
          : `${stat.avgCaught.toFixed(1)} ${labels.otherwise}`}
        {stat.worst > 0 ? ` · pire manche : ${stat.worst}` : ""} · {stat.total}{" "}
        pts au total
      </p>
    </li>
  );
}
