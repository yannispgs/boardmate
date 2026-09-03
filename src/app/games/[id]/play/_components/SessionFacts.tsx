"use client";

import type { GameListItem, PopulatedGame } from "@/lib/domain";
import { MIN_PARTIES } from "@/lib/game/session-facts";

import { SessionFactsPanel } from "./SessionFactsPanel";

/**
 * The evening's remarkable facts — but first, whether there is an evening at
 * all.
 *
 * 🔑 The guard lives here rather than inside the panel on purpose: reading the
 * facts means pulling the boardgame's whole history down, and that cost belongs
 * to a long sitting only. Not mounting {@link SessionFactsPanel} is what keeps
 * an ordinary party — the vast majority — from paying for a query it has no use
 * for.
 */
export function SessionFacts({
  game,
  games,
}: Readonly<{
  game: PopulatedGame;
  /** The sitting's parties, oldest first. */
  games: readonly GameListItem[];
}>) {
  const played = games.filter(party => party.status === "ended").length;

  // Said rather than left blank. A section that appears on the fourth party of
  // an evening and on no other looks like a bug on the first three, and the
  // count turns the rule into a distance: one more party to go.
  if (played < MIN_PARTIES) {
    return (
      <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
        {`Les faits de la soirée apparaissent à partir de ${MIN_PARTIES} parties jouées d'affilée (${played} pour l'instant).`}
      </p>
    );
  }

  return <SessionFactsPanel game={game} games={games} />;
}
