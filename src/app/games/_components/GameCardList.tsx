"use client";

import type { BoardgameId, GameListItem } from "@/lib/domain";
import { GameCard } from "./GameCard";

/** The list of ongoing games; resolves each game's boardgame name via `nameOf`. */
export function GameCardList({
  games,
  nameOf,
}: {
  games: GameListItem[];
  nameOf: (id: BoardgameId) => string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {games.map(game => (
        <GameCard
          key={game.id}
          game={game}
          boardgameName={nameOf(game.boardgameId)}
        />
      ))}
    </ul>
  );
}
