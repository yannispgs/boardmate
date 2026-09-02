"use client";

import { useMemo } from "react";

import type { GameStatsRecord, PopulatedGame } from "@/lib/domain";
import type { PartyMeasure } from "@/lib/game/party-figures";
import { partyMeasures } from "@/lib/game/party-figures";
import { useGameStats } from "./use-game-stats";

/**
 * The parties tonight is read against: the same game, at the **same table
 * size**, tonight left out.
 *
 * The table size is not a nicety. Half the figures on this panel are durations,
 * and a Cascadia at two and a Cascadia at four are not long and short versions
 * of the same evening — mixed together, a bar on « Temps de jeu » would mostly
 * report how many people were sitting down. A party is not a reference for
 * itself either, which is the second half of the filter.
 */
function comparable(
  records: readonly GameStatsRecord[],
  game: PopulatedGame,
): GameStatsRecord[] {
  return records.filter(r => {
    return (
      r.boardgameId === game.boardgameId &&
      r.gameId !== game.id &&
      r.players.length === game.players.length
    );
  });
}

/**
 * The « La partie » figures of the evening just finished, each placed among the
 * same figure of the comparable parties before it.
 *
 * Reads the history `useGameStats` already pulls down for the record banners
 * and the player recaps, so it costs no extra request — but, like them, it only
 * belongs on the end-of-game screen.
 */
export function usePartyMeasures(
  game: PopulatedGame,
  simultaneous: boolean,
): PartyMeasure[] {
  const { records } = useGameStats();

  return useMemo(() => {
    return partyMeasures({
      tonight: game.turns,
      history: comparable(records, game).map(r => {
        return r.turns;
      }),
      roundLimit: game.boardgame.roundLimit,
      simultaneous,
    });
  }, [game, records, simultaneous]);
}
