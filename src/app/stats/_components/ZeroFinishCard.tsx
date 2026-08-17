import type { ZeroFinishStat } from "@/lib/game/zero-finishes";

/**
 * One player's record at walking away from a party with nothing, across the
 * parties in scope. The bar is the rate itself, so the lines compare down the
 * column.
 */
export function ZeroFinishCard({
  stat,
  rank,
}: Readonly<{ stat: ZeroFinishStat; rank: number }>) {
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
            de parties à 0
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
        {stat.zeroes} partie{stat.zeroes > 1 ? "s" : ""} à 0 sur {stat.games}{" "}
        jouée{stat.games > 1 ? "s" : ""}
      </p>
    </li>
  );
}
