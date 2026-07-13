"use client";

import Link from "next/link";

import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import type { BoardgameId, GameListItem } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useGames } from "@/lib/hooks/use-games";
import { GameCardList } from "./GameCardList";

export function GamesList() {
  const { games, endedGames, loading, error, removeGame } = useGames();
  const { boardgames } = useBoardgames();
  const { requestConfirm, confirmDialog } = useConfirm();

  const boardgameFor = (id: BoardgameId) => boardgames.find(b => b.id === id);

  function handleAbandon(game: GameListItem) {
    const name = boardgameFor(game.boardgameId)?.name ?? "cette partie";

    requestConfirm({
      message:
        `Abandonner la partie de « ${name} » ?\n\n` +
        "Elle sera définitivement supprimée (aucun score enregistré).",
      confirmLabel: "Abandonner",
      onConfirm: () => removeGame(game.id),
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {/* Only the list of games scrolls; the header above and the action bar
          below stay put. */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Chargement…</p>
        ) : games.length === 0 && endedGames.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune partie. Lance-en une !</p>
        ) : (
          <>
            {games.length > 0 ? (
              <GameCardList
                games={games}
                boardgameFor={boardgameFor}
                onAbandon={handleAbandon}
              />
            ) : (
              <p className="text-sm text-zinc-500">Aucune partie en cours.</p>
            )}

            {endedGames.length > 0 ? (
              <GameCardList
                games={endedGames}
                boardgameFor={boardgameFor}
                ended
                collapsible
                title="Terminées"
              />
            ) : null}
          </>
        )}
      </div>

      <StickyActionBar>
        <Link
          href="/games/new"
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
        >
          + Nouvelle partie
        </Link>
      </StickyActionBar>

      {confirmDialog}
    </div>
  );
}
