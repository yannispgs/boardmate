import type { PlayerPace } from "@/lib/game/score-pace";
import { formatPerTurn } from "@/lib/game/score-pace";

/**
 * One player's pace: their score, the turns they actually took, and the rate
 * between the two. The bar compares rates rather than scores — that is the
 * whole reason this list sits next to the final ranking.
 */
export function ScorePaceCard({
  pace,
  rank,
  isWinner,
  scale,
  shortest,
}: Readonly<{
  pace: PlayerPace;
  rank: number;
  isWinner: boolean;
  /** Best rate of the table — shared scale, so the bars compare. */
  scale: number;
  /** Fewest turns anyone took, the yardstick for "played more turns". */
  shortest: number;
}>) {
  const width =
    scale > 0 && pace.perTurn !== null ? (pace.perTurn / scale) * 100 : 0;
  const extraTurns = pace.turnCount - shortest;

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="text-xs text-zinc-400 tabular-nums">{rank}.</span>
          {pace.name}
          {isWinner ? (
            <span role="img" aria-label="Vainqueur">
              🏆
            </span>
          ) : null}
        </span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{formatPerTurn(pace.perTurn)}</span>{" "}
          <span className="text-zinc-500 dark:text-zinc-400">pts/tour</span>
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-zinc-400 dark:bg-zinc-500"
          style={{ width: `${width}%` }}
        />
      </div>

      <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        {pace.score ?? "—"} pts · {pace.turnCount} tour
        {pace.turnCount > 1 ? "s" : ""}
        {extraTurns > 0 ? (
          <span className="text-zinc-400 dark:text-zinc-500">
            {" "}
            · +{extraTurns} vs le moins servi
          </span>
        ) : null}
      </p>
    </li>
  );
}
