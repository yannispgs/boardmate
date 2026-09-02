"use client";

import { useMemo } from "react";

import type { GameStatsRecord, PopulatedGame } from "@/lib/domain";
import type { PartyMeasure } from "@/lib/game/party-figures";
import { partyMeasures } from "@/lib/game/party-figures";
import { useGameStats } from "./use-game-stats";

/**
 * The parties tonight is read against: the same game, tonight left out, and —
 * on a game whose figures really move with the table — the same table size.
 *
 * The size is only applied where the game says it counts (`playerCountSensitive`,
 * the same flag the records and the player recaps read). Narrowing everywhere
 * looked right and was mostly a way of emptying the panel: on a real history,
 * five parties out of six had **nobody** to be compared with at their own table
 * size, so the bars simply never appeared. A game the flag leaves out is one
 * whose scale barely moves with the seat count, and there the wider basket is
 * both fuller and no less honest.
 */
function comparable(
  records: readonly GameStatsRecord[],
  game: PopulatedGame,
): GameStatsRecord[] {
  const atSize = game.boardgame.scoring?.playerCountSensitive === true;

  return records.filter(r => {
    return (
      r.boardgameId === game.boardgameId &&
      r.gameId !== game.id &&
      (!atSize || r.players.length === game.players.length)
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
