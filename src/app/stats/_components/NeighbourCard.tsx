import type { NeighbourStat } from "@/lib/game/neighbour-stats";

/** The 0–1 placement said the way the rest of the page says it: 0 to 100. */
export function positionIndex(position: number): number {
  return Math.round(position * 100);
}

/** A pile average, to one decimal — the piles themselves are small integers. */
export function pileFigure(pile: number): string {
  return pile.toFixed(1).replace(".", ",");
}

/**
 * What sitting next to one player is worth. The bar is the placement index
 * itself and fills from the left, so a long bar is a heavy neighbour — the
 * lines then compare straight down the column without reading a single figure.
 *
 * The shared pile sits underneath as the honest half of the answer: a
 * placement is built from both of a player's piles, so it carries his other
 * neighbour too, while the pile carries these two and nobody else.
 */
export function NeighbourCard({
  stat,
  pileAverage,
  onOpen,
}: Readonly<{
  stat: NeighbourStat;
  /** Every pile of every counted party, averaged — what the pile reads against. */
  pileAverage: number | null;
  onOpen: () => void;
}>) {
  const index =
    stat.neighbourPosition === null
      ? null
      : positionIndex(stat.neighbourPosition);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-1.5 rounded-xl p-2 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate font-medium">
            À côté de {stat.name}
          </span>
          <span className="shrink-0 text-sm tabular-nums">
            <span className="font-semibold">{index ?? "—"}</span>{" "}
            <span className="text-zinc-500 dark:text-zinc-400">/ 100</span>
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${index ?? 0}%` }}
          />
        </div>

        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {stat.parties} partie{stat.parties > 1 ? "s" : ""} · {stat.encounters}{" "}
          voisinage{stat.encounters > 1 ? "s" : ""}
          {stat.neighbourWinRate === null
            ? null
            : ` · ${Math.round(stat.neighbourWinRate * 100)} % de victoires`}
          {stat.sharedPile === null ? null : (
            <>
              {" · pile "}
              <span className="font-medium">{pileFigure(stat.sharedPile)}</span>
              {pileAverage === null
                ? null
                : ` (moyenne ${pileFigure(pileAverage)})`}
            </>
          )}
        </p>
      </button>
    </li>
  );
}
