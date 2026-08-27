"use client";

import { useEffect, useState } from "react";
import type { GameId, GameListItem, GameSessionId } from "@/lib/domain";
import { getGameRepository } from "@/lib/repositories";

/**
 * The parties of the sitting the played game belongs to, oldest first.
 *
 * 🪤 Keyed on the **played party** as well as the sitting, and it has to be:
 * dealing the next party navigates to it *within the same session*, and the
 * play screen is re-rendered rather than remounted — so a sitting-only key
 * would leave the screen holding the list as it was before the new party
 * existed, and the party on the table absent from its own evening.
 *
 * Failures stay silent: this feeds a recap beside the game, not the game
 * itself, and an evening's tally is not worth an error banner over the table.
 */
export function useSessionGames(
  sessionId: GameSessionId,
  gameId: GameId,
): GameListItem[] {
  const repo = getGameRepository();
  const [games, setGames] = useState<GameListItem[]>([]);

  useEffect(() => {
    let live = true;

    repo
      .listBySession(sessionId)
      .then(loaded => {
        // A sitting that does not hold the party being played was read before
        // that party was saved: keeping the previous answer beats showing an
        // evening its own deal is missing from.
        if (live && loaded.some(party => party.id === gameId)) {
          setGames(loaded);
        }
      })
      .catch(() => {
        // Nothing to show reads as a sitting of one, which is the common case.
      });

    return () => {
      live = false;
    };
  }, [repo, sessionId, gameId]);

  return games;
}
