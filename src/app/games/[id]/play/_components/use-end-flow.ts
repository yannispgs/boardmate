"use client";

import { useState } from "react";
import type { PlayerId, PopulatedGame, TieBreakRecord } from "@/lib/domain";
import {
  categoryOutcome,
  type EndOutcome,
  type FinalScores,
  pairOutcome,
  totalOutcome,
} from "@/lib/game/end-outcome";
import { getGameRepository } from "@/lib/repositories";
import type { PlayGame } from "./use-play-game";

const END_FAILED = "Impossible de terminer la partie.";

/** Where the end-of-game sequence stands: still playing, revealing, or reading
 * the score sheet the reveal led to. */
export type EndPhase = "play" | "reveal" | "table";

export interface EndFlowState {
  phase: EndPhase;
  outcome: EndOutcome | null;
  /** Whether the end-of-game score form (or winner pick) is on screen — it
   * takes the timer's place while it is. */
  entryOpen: boolean;
  setEntryOpen: (open: boolean) => void;
  /** Opened from the reveal once it uncovers leaders that came out level. */
  tieOpen: boolean;
  setTieOpen: (open: boolean) => void;
  endByHand: (winnerIds: PlayerId[]) => Promise<void>;
  endWithLiveScores: (
    winnerIds: PlayerId[],
    scores: FinalScores,
    tieBreak: TieBreakRecord | null,
  ) => Promise<void>;
  endCoop: (won: boolean) => Promise<void>;
  finishCategories: (
    values: Record<string, Record<string, number>>,
  ) => Promise<void>;
  finishPairs: (piles: Record<string, number>) => Promise<void>;
  finishTotals: (
    scores: Array<{ playerId: PlayerId; score: number }>,
    override: PlayerId | null,
  ) => Promise<void>;
  settleTie: (
    winnerIds: PlayerId[],
    record: TieBreakRecord | null,
  ) => Promise<void>;
  leaveReveal: () => Promise<void>;
}

/**
 * Everything that happens once the table stops playing: counting the points on
 * whichever sheet the game uses, revealing the standings, settling a tie, and
 * recording the finished game.
 */
export function useEndFlow(game: PopulatedGame, play: PlayGame): EndFlowState {
  const repo = getGameRepository();
  const [phase, setPhase] = useState<EndPhase>("play");
  const [outcome, setOutcome] = useState<EndOutcome | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [tieOpen, setTieOpen] = useState(false);

  /** Records the finished game; false when it failed and the screen must stay. */
  async function persist(
    ended: EndOutcome,
    tieBreak: TieBreakRecord | null,
  ): Promise<boolean> {
    return play.run(END_FAILED, () =>
      repo.end(game.id, ended.winners, ended.scores, tieBreak),
    );
  }

  /**
   * Hands a finished scored game over to the reveal, which climbs the standings
   * from the last place to the first. A lone leader is recorded up front; level
   * leaders leave `winners` empty so nothing is written — and nothing shown —
   * until the reveal reaches their place and the table settles it there.
   */
  async function reveal(ended: EndOutcome) {
    if (ended.winners.length > 0 && !(await persist(ended, null))) {
      return;
    }

    setEntryOpen(false);
    setOutcome(ended);
    setPhase("reveal");
  }

  async function end(
    winnerIds: PlayerId[],
    scores: FinalScores | undefined,
    tieBreak: TieBreakRecord | null,
  ) {
    await play.run(END_FAILED, async () => {
      await repo.end(game.id, winnerIds, scores, tieBreak);
      await play.reload();
    });
  }

  return {
    phase,
    outcome,
    entryOpen,
    setEntryOpen,
    tieOpen,
    setTieOpen,

    endByHand: winnerIds => end(winnerIds, undefined, handPicked(winnerIds)),

    endWithLiveScores: (winnerIds, scores, tieBreak) =>
      end(winnerIds, scores, tieBreak),

    // Cooperative games end on a shared outcome (all win, or none).
    endCoop: async won => {
      await play.run(END_FAILED, async () => {
        await repo.endCoop(game.id, won);
        await play.reload();
      });
    },

    finishCategories: async values => {
      const sheet = game.boardgame.scoring?.sheet;

      if (!sheet) {
        return;
      }

      await reveal(categoryOutcome(sheet, values, seats(game)));
    },

    finishPairs: piles => reveal(pairOutcome(seats(game), piles)),

    finishTotals: (scores, override) =>
      reveal(
        totalOutcome(
          scores,
          game.boardgame.scoring?.winCondition ?? null,
          override,
        ),
      ),

    /** Records the game once the reveal's tie-break has named the winners. */
    settleTie: async (winnerIds, record) => {
      if (outcome === null) {
        return;
      }

      const settled = { ...outcome, winners: winnerIds };

      if (await persist(settled, record)) {
        setTieOpen(false);
        setOutcome(settled);
      }
    },

    /** Leaves the reveal: the score sheet for a sheet-scored game, the recap
     * (through a reload) for the rest. */
    leaveReveal: async () => {
      if (hasSheet(outcome)) {
        setPhase("table");

        return;
      }

      setPhase("play");
      await play.reload();
    },
  };
}

function seats(game: PopulatedGame): PlayerId[] {
  return game.players.map(p => p.playerId);
}

/** Whether the reveal is followed by a score sheet to read. */
function hasSheet(outcome: EndOutcome | null): boolean {
  return Boolean(outcome?.values ?? outcome?.piles);
}

/**
 * The record left by a winner named by hand: several names is a shared victory
 * the table decided on, with no score to explain it.
 */
function handPicked(winnerIds: PlayerId[]): TieBreakRecord | null {
  return winnerIds.length > 1
    ? { tied: winnerIds, steps: [], shared: true }
    : null;
}
