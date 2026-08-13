import type { TallyExitStat } from "@/lib/game/tally-averages";

/**
 * One player's record at going out, across the parties in scope: how often the
 * manche ended on them, and what the manches they didn't close cost them. The
 * bar is the rate itself, so the lines compare down the column.
 */
export function TallyExitCard({
  stat,
  rank,
}: Readonly<{ stat: TallyExitStat; rank: number }>) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="text-xs text-zinc-400 tabular-nums">{rank}.</span>
          {stat.name}
        </span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{Math.round(stat.rate * 100)} %</span>{" "}
          <span className="text-zinc-500 dark:text-zinc-400">de sorties</span>
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${stat.rate * 100}%` }}
        />
      </div>

      <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        {stat.exits} sortie{stat.exits > 1 ? "s" : ""} sur {stat.stages} manche
        {stat.stages > 1 ? "s" : ""}
        {stat.avgCaught === null
          ? ""
          : ` · ${stat.avgCaught.toFixed(1)} pts/manche hors sortie`}
      </p>
    </li>
  );
}
