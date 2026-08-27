"use client";

import type { GameListItem, PopulatedGame } from "@/lib/domain";
import { scoreDirectionOf } from "@/lib/game/scoring";
import {
  comparableScores,
  remarkableScore,
  sessionFacts,
} from "@/lib/game/session-facts";
import { sessionParties } from "@/lib/game/session-stats";
import { useGameStats } from "@/lib/hooks/use-game-stats";

import { SessionFactCardList } from "./SessionFactCardList";

/**
 * The facts themselves, and the only thing that pulls the boardgame's history
 * down — mounted by {@link SessionFacts} once the evening is long enough to be
 * worth the query, never on the short party that most of them are.
 *
 * The history is read for one figure alone: the score this game rarely gives
 * up, so « passe les 200 points » is measured against what a party of *this*
 * game usually pays rather than against a number picked out of the air.
 */
export function SessionFactsPanel({
  game,
  games,
}: Readonly<{
  game: PopulatedGame;
  /** The sitting's parties, oldest first — runs only exist in that order. */
  games: readonly GameListItem[];
}>) {
  const { records } = useGameStats();
  const scoring = game.boardgame.scoring;
  const direction = scoreDirectionOf(scoring);
  const facts = sessionFacts({
    parties: sessionParties(games),
    direction,
    remarkable: remarkableScore(
      comparableScores({
        history: records,
        boardgameId: game.boardgameId,
        scoring,
        seats: game.players.length,
      }),
      direction,
    ),
  });

  // An evening long enough to be read can still have nothing remarkable in it,
  // and an empty box titled « Faits de la soirée » would be worse than none.
  if (facts.length === 0) {
    return null;
  }

  return (
    <section className="flex w-full max-w-sm flex-col gap-2">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Faits de la soirée
      </h2>

      <SessionFactCardList facts={facts} />
    </section>
  );
}
