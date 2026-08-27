"use client";

import Link from "next/link";

import { ErrorText } from "@/components/ErrorText";
import { ListBody } from "@/components/ListBody";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import type { BoardgameId, GameListItem } from "@/lib/domain";
import { filterGameList } from "@/lib/game/game-filters";
import {
  closingSessionSize,
  partyRanks,
  sessionSections,
} from "@/lib/game/game-sessions";
import { finishedParties, recordHolders } from "@/lib/game/score-records";
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

/**
 * What abandoning the last running deal of an evening costs, `sealed` being the
 * finished parties it would be sealed at. Says what is kept as well as what is
 * lost: « clôturée » on its own reads as if the whole evening went with it.
 */
function sealedWarning(sealed: number): string {
  const kept =
    sealed === 1
      ? "La partie déjà terminée reste"
      : `Les ${sealed} parties déjà terminées restent`;

  return (
    "C'est la dernière partie en cours de la soirée : l'abandonner clôturera " +
    `la session, qui ne pourra plus être reprise. ${kept} dans l'historique.`
  );
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

  // Grouped across both reads before being split, so an evening whose last deal
  // is still on the table stays whole and stays out of the « Terminées » fold.
  const { live, finished } = sessionSections([
    ...filterGameList(games, filter),
    ...filterGameList(endedGames, filter),
  ]);
  const shown = live.length + finished.length;
  // Read against every finished party, not the shown ones: a record is a fact
  // about the game, and narrowing the screen must not hand it to someone else.
  const records = recordHolders(
    finishedParties(endedGames),
    new Map(boardgames.map(b => [b.id, b.scoring])),
  );
  // Read against both sections at once: an evening usually has its last deal
  // still running while the earlier ones are over, and numbering each section
  // on its own would give the table two « #1 ».
  const ranks = partyRanks([...games, ...endedGames]);

  function handleAbandon(game: GameListItem) {
    const name = boardgameFor(game.boardgameId)?.name ?? "cette partie";
    // An evening is only ever continued from the deal on the table, so dropping
    // the last one still running shuts it for good — said before the press, in
    // amber, because nothing else on the screen hints at it.
    const sealed = closingSessionSize(game, [...games, ...endedGames]);

    requestConfirm({
      message:
        `Abandonner la partie de « ${name} » ?\n\n` +
        "Elle sera définitivement supprimée (aucun score enregistré).",
      warning: sealed === null ? undefined : sealedWarning(sealed),
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
        <ErrorText message={error} />

        <ListBody
          loading={loading}
          message={emptyMessage(games.length + endedGames.length, shown)}
        >
          {live.length > 0 ? (
            <GameCardList
              entries={live}
              boardgameFor={boardgameFor}
              records={records}
              partyRanks={ranks}
              onAbandon={handleAbandon}
            />
          ) : null}

          {/* Worth saying nothing is running — unless "Terminées" is precisely
              what was asked for. */}
          {live.length === 0 && filter.status !== "ended" ? (
            <p className="text-sm text-zinc-500">Aucune partie en cours.</p>
          ) : null}

          {finished.length > 0 ? (
            <GameCardList
              entries={finished}
              boardgameFor={boardgameFor}
              collapsible
              title="Terminées"
              records={records}
              partyRanks={ranks}
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
