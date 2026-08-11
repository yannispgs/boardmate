"use client";

import { ChevronRightIcon } from "@/components/icons";
import type { Boardgame, BoardgameId, GameListItem } from "@/lib/domain";
import { gameProgress } from "@/lib/game/game-progress";
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
  onAbandon,
}: Readonly<{
  games: GameListItem[];
  boardgameFor: (id: BoardgameId) => Boardgame | undefined;
  ended?: boolean;
  collapsible?: boolean;
  title?: string;
  /** Ongoing games only: abandon (delete) a game. */
  onAbandon?: (game: GameListItem) => void;
}>) {
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
            progress={gameProgress(game, boardgame?.stages ?? null)}
            ended={ended}
            coop={boardgame?.kind === "cooperative"}
            onAbandon={onAbandon ? () => onAbandon(game) : undefined}
          />
        );
      })}
    </ul>
  );

  if (collapsible) {
    return (
      <details className="group flex flex-col">
        <summary
          className={`sticky top-0 z-10 flex cursor-pointer list-none items-center gap-1.5 bg-[var(--background)] pt-1 pb-2 ${headingClass}`}
        >
          <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          {title} · {games.length}
        </summary>
        {cards}
      </details>
    );
  }

  return cards;
}
