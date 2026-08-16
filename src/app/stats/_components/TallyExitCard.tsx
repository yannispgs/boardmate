import type { TallyExitStat } from "@/lib/game/tally-averages";
import type { TallyExitLabels } from "@/lib/game/tally-labels";

/**
 * One player's record at taking no point on a manche, across the parties in
 * scope: how often it happened, and what the other manches cost them. The bar
 * is the rate itself, so the lines compare down the column.
 *
 * What that zero is *called* comes from the game (see {@link TallyExitLabels}):
 * a sortie at Odin, where the manche ended on that player, and simply a manche
 * at 0 at Papayoo, where nobody goes out.
 */
export function TallyExitCard({
  stat,
  labels,
  rank,
}: Readonly<{
  stat: TallyExitStat;
  labels: TallyExitLabels;
  rank: number;
}>) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="text-xs text-zinc-400 tabular-nums">{rank}.</span>
          {stat.name}
        </span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{Math.round(stat.rate * 100)} %</span>{" "}
          <span className="text-zinc-500 dark:text-zinc-400">
            {labels.rate}
          </span>
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${stat.rate * 100}%` }}
        />
      </div>

      <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        {stat.exits} {stat.exits > 1 ? labels.events : labels.event} sur{" "}
        {stat.stages} manche{stat.stages > 1 ? "s" : ""}
        {stat.avgCaught === null
          ? ""
          : ` · ${stat.avgCaught.toFixed(1)} ${labels.otherwise}`}
      </p>
    </li>
  );
}
