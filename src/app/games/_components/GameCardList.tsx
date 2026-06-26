"use client";

import type { Boardgame, BoardgameId, GameListItem } from "@/lib/domain";
import { GameCard } from "./GameCard";

/**
 * The list of ongoing games; resolves each game's boardgame (name + logo) via
 * `boardgameFor`.
 */
export function GameCardList({
  games,
  boardgameFor,
}: {
  games: GameListItem[];
  boardgameFor: (id: BoardgameId) => Boardgame | undefined;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {games.map(game => {
        const boardgame = boardgameFor(game.boardgameId);

        return (
          <GameCard
            key={game.id}
            game={game}
            boardgameName={boardgame?.name ?? "Partie"}
            logoUrl={boardgame?.logoUrl ?? null}
          />
        );
      })}
    </ul>
  );
}
