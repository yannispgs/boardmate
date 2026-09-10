"use client";

import { useMemo } from "react";

import type { PopulatedGame } from "@/lib/domain";
import type { PartyMeasure } from "@/lib/game/party-figures";
import { partyMeasures } from "@/lib/game/party-figures";
import { offTurnSeconds } from "@/lib/game/phase-stats";
import { useComparableParties } from "./use-comparable-parties";

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
  const history = useComparableParties(game);

  return useMemo(() => {
    const phases = game.boardgame.phases;

    return partyMeasures({
      tonight: {
        turns: game.turns,
        offTurnS: offTurnSeconds(game.phaseTimes, phases),
      },
      history: history.map(r => {
        return {
          turns: r.turns,
          // A party recorded before this game was given its phases has no rows
          // at all; it then measures as its log, which is what it was.
          offTurnS: offTurnSeconds(r.phaseTimes ?? [], phases),
        };
      }),
      roundLimit: game.boardgame.roundLimit,
      simultaneous,
    });
  }, [game, history, simultaneous]);
}
