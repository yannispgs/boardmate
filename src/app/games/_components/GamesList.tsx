"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { ListBody } from "@/components/ListBody";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import type { BoardgameId, GameListItem } from "@/lib/domain";
import { activeFilterCount, filterGameList } from "@/lib/game/game-filters";
import {
  closingSessionSize,
  entryGames,
  partyRanks,
  sessionSections,
} from "@/lib/game/game-sessions";
import { type GamesTab, gamesTabHref, shownTab } from "@/lib/game/games-tab";
import { finishedParties, recordHolders } from "@/lib/game/score-records";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useGames } from "@/lib/hooks/use-games";
import { useMyPermissions } from "@/lib/hooks/use-my-permissions";
import { EntryModeToggle } from "./EntryModeToggle";
import { GameCardList } from "./GameCardList";
import { useGameFilter } from "./use-game-filter";

/**
 * What stands in for the tab's list: never having played, having filtered
 * every game out, or simply nothing on that side. `null` once there is
 * something to show.
 */
function emptyMessage(
  recorded: number,
  shown: number,
  filtered: boolean,
  tab: GamesTab,
): string | null {
  if (recorded === 0) {
    return "Aucune partie. Lance-en une !";
  }

  if (shown > 0) {
    return null;
  }

  if (filtered) {
    return "Aucune partie ne correspond aux filtres.";
  }

  return tab === "live" ? "Aucune partie en cours." : "Aucune partie terminée.";
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

/**
 * « Parties »: two tabs, the games still on the table and the history. The tab
 * opened comes from the address (`initialTab`), and switching rewrites it, so
 * the back button returns to the tab a game was opened from.
 */
export function GamesList({
  initialTab,
}: Readonly<{ initialTab: GamesTab | null }>) {
  const router = useRouter();
  const [asked, setAsked] = useState(initialTab);
  const { games, endedGames, loading, error, removeGame } = useGames();
  const { boardgames } = useBoardgames();
  const { can } = useMyPermissions();
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
  // A running evening's finished deals sit with it on the live side, so each
  // tab counts its parties: the running ones, then those in the history.
  const running = filterGameList(games, filter).length;
  const ended = finished.reduce(
    (total, entry) => total + entryGames(entry).length,
    0,
  );
  const tab = shownTab(asked, running);
  const entries = tab === "live" ? live : finished;
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

  function pickTab(next: GamesTab) {
    setAsked(next);
    router.replace(gamesTabHref(next), { scroll: false });
  }

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
        description="Les parties en cours et l'historique des parties terminées."
        action={filterToggle}
      >
        {filterPanel}
      </ScreenHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <ErrorText message={error} />

        <EntryModeToggle
          name="vue"
          value={tab}
          options={[
            { value: "live", label: `En cours · ${running}` },
            { value: "ended", label: `Terminées · ${ended}` },
          ]}
          onChange={pickTab}
        />

        <ListBody
          loading={loading}
          message={emptyMessage(
            games.length + endedGames.length,
            entries.length,
            activeFilterCount(filter) > 0,
            tab,
          )}
        >
          <GameCardList
            entries={entries}
            boardgameFor={boardgameFor}
            records={records}
            partyRanks={ranks}
            onAbandon={can("games.delete") ? handleAbandon : undefined}
          />
        </ListBody>

        {/* Both doors open the same right — composing a party — so they leave
            together. */}
        {can("games.create") ? (
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
        ) : null}

        {confirmDialog}
      </div>
    </>
  );
}
