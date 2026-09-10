"use client";

import { useMemo } from "react";

import type { PopulatedGame } from "@/lib/domain";
import type { PhaseMeasure } from "@/lib/game/phase-stats";
import { phaseMeasures } from "@/lib/game/phase-stats";
import { useComparableParties } from "./use-comparable-parties";

/**
 * Tonight's phases, each placed among the same phase of the comparable parties
 * before it — the « Temps par phase » counterpart of
 * {@link ./use-party-measures.usePartyMeasures}, reading the same basket so the
 * two sets of bars on that screen answer the same question.
 *
 * Costs no extra request: the history is the one `useGameStats` already pulls
 * down for the record banners. Like it, it only belongs on the end-of-game
 * screen.
 */
export function usePhaseMeasures(game: PopulatedGame): PhaseMeasure[] {
  const history = useComparableParties(game);

  return useMemo(() => {
    return phaseMeasures(
      game.phaseTimes,
      history.map(r => {
        return r.phaseTimes ?? [];
      }),
      game.boardgame.phases,
    );
  }, [game, history]);
}
