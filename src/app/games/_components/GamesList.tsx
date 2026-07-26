"use client";

import Link from "next/link";

import { ListBody } from "@/components/ListBody";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import type { BoardgameId, GameListItem } from "@/lib/domain";
import { filterGameList } from "@/lib/game/game-filters";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useGames } from "@/lib/hooks/use-games";
import { GameCardList } from "./GameCardList";
import { useGameFilter } from "./use-game-filter";

/**
 * What stands in for the list: never having played, or having filtered every
 * game out. `null` once there is something to show.
 */
function emptyMessage(recorded: number, shown: number): string | null {
  if (recorded === 0) {
    return "Aucune partie. Lance-en une !";
  }

  if (shown === 0) {
    return "Aucune partie ne correspond aux filtres.";
  }

  return null;
}

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

        <ListBody
          loading={loading}
          message={emptyMessage(
            games.length + endedGames.length,
            shownGames.length + shownEnded.length,
          )}
        >
          {shownGames.length > 0 ? (
            <GameCardList
              games={shownGames}
              boardgameFor={boardgameFor}
              onAbandon={handleAbandon}
            />
          ) : null}

          {/* Worth saying nothing is running — unless "Terminées" is precisely
              what was asked for. */}
          {shownGames.length === 0 && filter.status !== "ended" ? (
            <p className="text-sm text-zinc-500">Aucune partie en cours.</p>
          ) : null}

          {shownEnded.length > 0 ? (
            <GameCardList
              games={shownEnded}
              boardgameFor={boardgameFor}
              ended
              collapsible
              title="Terminées"
            />
          ) : null}
        </ListBody>

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
