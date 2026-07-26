"use client";

import Link from "next/link";

import { ScreenHeader } from "@/components/ScreenHeader";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import type { BoardgameId, GameListItem } from "@/lib/domain";
import { filterGameList } from "@/lib/game/game-filters";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useGames } from "@/lib/hooks/use-games";
import { GameCardList } from "./GameCardList";
import { useGameFilter } from "./use-game-filter";

export function GamesList() {
  const { games, endedGames, loading, error, removeGame } = useGames();
  const { boardgames } = useBoardgames();
  const { requestConfirm, confirmDialog } = useConfirm();

  const boardgameFor = (id: BoardgameId) => boardgames.find(b => b.id === id);

  // The filter offers what has been played, running or finished, so a criterion
  // is never missing just because the only such game is over.
  const { filter, filterToggle, filterPanel } = useGameFilter({
    games: [...games, ...endedGames],
    nameOf: id => boardgameFor(id)?.name,
  });

  const shownGames = filterGameList(games, filter);
  const shownEnded = filterGameList(endedGames, filter);

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
    <>
      <ScreenHeader
        title="Parties"
        description="Les parties en cours. L'historique des parties terminées arrivera avec les statistiques."
        action={filterToggle}
      >
        {filterPanel}
      </ScreenHeader>

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
            <p className="text-sm text-zinc-500">
              Aucune partie. Lance-en une !
            </p>
          ) : shownGames.length === 0 && shownEnded.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune partie ne correspond aux filtres.
            </p>
          ) : (
            <>
              {shownGames.length > 0 ? (
                <GameCardList
                  games={shownGames}
                  boardgameFor={boardgameFor}
                  onAbandon={handleAbandon}
                />
              ) : filter.status === "ended" ? null : (
                // Worth saying nothing is running — unless "Terminées" is
                // precisely what was asked for.
                <p className="text-sm text-zinc-500">Aucune partie en cours.</p>
              )}

              {shownEnded.length > 0 ? (
                <GameCardList
                  games={shownEnded}
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
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/games/new"
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
            >
              + Nouvelle partie
            </Link>
            <Link
              href="/games/finished"
              className="rounded-lg border border-black/15 px-3 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              ＋ Ajouter une partie terminée
            </Link>
          </div>
        </StickyActionBar>

        {confirmDialog}
      </div>
    </>
  );
}
