"use client";

import { useMemo } from "react";

import type { GameStatsRecord, PopulatedGame } from "@/lib/domain";
import { comparableParties } from "@/lib/game/comparable-parties";
import { useGameStats } from "./use-game-stats";

/**
 * The parties the evening just finished is measured against, pulled from the
 * history `useGameStats` already loads for the record banners — so it costs no
 * extra request, and, like it, only belongs on the end-of-game screen.
 *
 * Shared by the two sets of bars on that screen (the party's tiles and the phase
 * legend) so both are drawn on the same basket; the rule itself lives in
 * {@link ../game/comparable-parties.comparableParties}.
 */
export function useComparableParties(game: PopulatedGame): GameStatsRecord[] {
  const { records } = useGameStats();

  return useMemo(() => {
    return comparableParties(records, {
      id: game.id,
      boardgameId: game.boardgameId,
      playerCount: game.players.length,
      atTableSize: game.boardgame.scoring?.playerCountSensitive === true,
    });
  }, [records, game]);
}
