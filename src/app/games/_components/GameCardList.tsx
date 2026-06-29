"use client";

import { ChevronRightIcon } from "@/components/icons";
import type { Boardgame, BoardgameId, GameListItem } from "@/lib/domain";
import { GameCard } from "./GameCard";

const headingClass =
  "text-xs font-semibold uppercase tracking-wide text-zinc-400";

/**
 * A list of games; resolves each game's boardgame (name + logo) via
 * `boardgameFor`. The ended list passes `ended` (dimmed, "Terminée" badge) and
 * `collapsible` to hide its cards behind a disclosure, like deactivated
 * players/boardgames.
 */
export function GameCardList({
  games,
  boardgameFor,
  ended = false,
  collapsible = false,
  title,
}: {
  games: GameListItem[];
  boardgameFor: (id: BoardgameId) => Boardgame | undefined;
  ended?: boolean;
  collapsible?: boolean;
  title?: string;
}) {
  const cards = (
    <ul className="flex flex-col gap-2">
      {games.map(game => {
        const boardgame = boardgameFor(game.boardgameId);

        return (
          <GameCard
            key={game.id}
            game={game}
            boardgameName={boardgame?.name ?? "Partie"}
            logoUrl={boardgame?.logoUrl ?? null}
            ended={ended}
          />
        );
      })}
    </ul>
  );

  if (collapsible) {
    return (
      <details className="group flex flex-col gap-2">
        <summary
          className={`flex cursor-pointer list-none items-center gap-1.5 ${headingClass}`}
        >
          <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          {title} · {games.length}
        </summary>
        <div className="mt-2">{cards}</div>
      </details>
    );
  }

  return cards;
}
