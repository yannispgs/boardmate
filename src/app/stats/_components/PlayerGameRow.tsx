import type { GameBreakdown } from "@/lib/game/global-stats";

import { PositionBar } from "./PositionBar";

/** The time index as a rounded number, or "—" when there's no time data. */
function fmtIndex(index: number | null): string {
  return index === null ? "—" : String(Math.round(index));
}

/**
 * One game in a player's record, as a line rather than a card.
 *
 * A card per game meant a border, a background and padding repeated eleven
 * times down a phone screen — three quarters of the height spent framing four
 * figures. Dropping the frame costs nothing: the rows are already told apart by
 * the rule between them, and the win-rate bar sits right under the name it
 * belongs to instead of floating inside a box.
 *
 * The bar stays. It is the only thing here read at a glance rather than
 * counted, and it is what makes « je suis bon à quoi ? » answerable without
 * reading a single number.
 *
 * Under it, once he has been ranked on the game enough times to say so, sits
 * where he tends to finish — the second bar the game's own player list carries.
 */
export function PlayerGameRow({
  game,
  timed,
  position,
}: Readonly<{
  game: GameBreakdown;
  /** His position index on this game; absent below the ranked-party floor. */
  position?: number;
  /** Whether this game attributes the time it records to a single player. */
  timed: boolean;
}>) {
  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate font-medium">
          {game.boardgameName}
        </span>
        <span className="text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
          {Math.round(game.winRate)}% victoire
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${game.winRate}%` }}
        />
      </div>

      {position === undefined ? null : (
        <PositionBar position={position} size="thin" />
      )}

      <div className="flex flex-wrap gap-x-3 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        <span>
          {game.games} partie{game.games > 1 ? "s" : ""}
        </span>
        <span>
          {game.wins} victoire{game.wins > 1 ? "s" : ""}
        </span>
        <span>
          moy. {game.avgScore === null ? "—" : game.avgScore.toFixed(1)}
        </span>
        {timed ? <span>temps {fmtIndex(game.timeIndex)}</span> : null}
      </div>
    </li>
  );
}
