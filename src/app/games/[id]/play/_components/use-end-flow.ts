"use client";

import { useRef, useState } from "react";
import type { PlayerId, PopulatedGame, TieBreakRecord } from "@/lib/domain";
import {
  categoryOutcome,
  type EndOutcome,
  type FinalScores,
  pairOutcome,
  totalOutcome,
} from "@/lib/game/end-outcome";
import { getGameRepository } from "@/lib/repositories";
import { AlreadyEndedError } from "@/lib/repositories/errors";
import type { PlayGame } from "./use-play-game";

const END_FAILED = "Impossible de terminer la partie.";

/**
 * How an end-of-game write went. « Already ended » is deliberately not a
 * failure: nothing was written because there was nothing left to write, and
 * the table has no reason to try again.
 */
type EndWrite = "done" | "failed" | "already-ended";

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
  /**
   * Opened once leaders come out level — from the reveal when there is one, and
   * from the score form itself when the table typed the totals.
   */
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
  /**
   * Ends a game on totals the **app** added up (Odin's manches), which the table
   * has not seen ranked: those go through the reveal.
   */
  finishTotals: (
    scores: Array<{ playerId: PlayerId; score: number }>,
    override: PlayerId | null,
  ) => Promise<void>;
  /**
   * Ends a game on totals the **table** typed. It read them off the sheet before
   * the app did, so climbing the standings place by place would reveal nothing:
   * the game is recorded straight away. When `chain` is set, an identical new
   * party opens instead of the recap.
   */
  finishTypedTotals: (
    scores: Array<{ playerId: PlayerId; score: number }>,
    override: PlayerId | null,
    chain: boolean,
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
export function useEndFlow(
  game: PopulatedGame,
  play: PlayGame,
  /** Opens the next party, once this one is recorded — see `chainedGame`. */
  onChain: () => Promise<void>,
): EndFlowState {
  const repo = getGameRepository();
  const [phase, setPhase] = useState<EndPhase>("play");
  const [outcome, setOutcome] = useState<EndOutcome | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [tieOpen, setTieOpen] = useState(false);
  // Set aside while the tie-break asks its questions: the table pressed
  // « Enchaîner », and still means to once the leaders are separated.
  const [chaining, setChaining] = useState(false);
  // Recording the party is terminal, but the screen it is asked from does not
  // leave the moment it lands: dealing the next party navigates, reading the
  // recap reloads, and until either arrives the button is still under the
  // table's thumb. A second press then recorded the same party again and dealt
  // a **second** next one — a phantom deal, numbered in the evening and never
  // played. `busy` cannot catch it: the first press is long over.
  const recorded = useRef(false);

  /**
   * Runs one end-of-game write and says which of the three things happened.
   *
   * The whole table has this screen open while the points are counted, and
   * only the first count through is recorded — so a write can come back
   * refused without anything being wrong. That is not a failure to retry: the
   * party is over, somebody else added it up, and all this screen can do is
   * drop what it was in the middle of and show what the table already decided.
   */
  async function recordEnd(mutate: () => Promise<void>): Promise<EndWrite> {
    let taken = false;

    const done = await play.run(END_FAILED, async () => {
      try {
        await mutate();
      } catch (cause) {
        if (!(cause instanceof AlreadyEndedError)) {
          throw cause;
        }

        taken = true;

        // Whatever the sequence had opened no longer applies to a party that
        // is already recorded, so it all closes and the reloaded game takes
        // over. The reason goes on **after** the reload, which clears the
        // message on its way in.
        setEntryOpen(false);
        setTieOpen(false);
        setPhase("play");
        await play.reload();
        play.setError(cause.message);
      }
    });

    if (taken) {
      return "already-ended";
    }

    return done ? "done" : "failed";
  }

  /**
   * Records the finished party, once and once only. Only a real failure
   * re-opens the latch: nothing was written, and the table has to be able to
   * try again. A party recorded elsewhere leaves it shut — pressing again
   * would just refuse again.
   */
  async function recordOnce(mutate: () => Promise<void>): Promise<void> {
    if (recorded.current) {
      return;
    }

    recorded.current = true;

    if ((await recordEnd(mutate)) === "failed") {
      recorded.current = false;
    }
  }

  /** Records the finished game; false when the screen must not move on. */
  async function persist(
    ended: EndOutcome,
    tieBreak: TieBreakRecord | null,
  ): Promise<boolean> {
    const written = await recordEnd(() =>
      repo.end(game.id, ended.winners, ended.scores, tieBreak),
    );

    return written === "done";
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
    await recordOnce(async () => {
      await repo.end(game.id, winnerIds, scores, tieBreak);
      await play.reload();
    });
  }

  /**
   * Records a game the table itself added up, and goes where the table asked:
   * the next party when it pressed « Enchaîner », the recap otherwise.
   */
  async function endTyped(
    ended: EndOutcome,
    tieBreak: TieBreakRecord | null,
    chain: boolean,
  ) {
    await recordOnce(async () => {
      await repo.end(game.id, ended.winners, ended.scores, tieBreak);

      if (chain) {
        await onChain();

        return;
      }

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
      await recordOnce(async () => {
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

    finishTypedTotals: async (scores, override, chain) => {
      const ended = totalOutcome(
        scores,
        game.boardgame.scoring?.winCondition ?? null,
        override,
      );

      // Leaders came out level: nothing can be recorded before the table
      // settles them, and with no reveal the prompt opens over the form.
      if (ended.winners.length === 0) {
        setChaining(chain);
        setOutcome(ended);
        setTieOpen(true);

        return;
      }

      await endTyped(ended, null, chain);
    },

    /** Records the game once the tie-break has named the winners. */
    settleTie: async (winnerIds, record) => {
      if (outcome === null) {
        return;
      }

      const settled = { ...outcome, winners: winnerIds };

      // Asked from the score form (no reveal): the game is recorded and the
      // screen moves on, exactly as a lone leader would have.
      if (phase === "play") {
        setTieOpen(false);
        await endTyped(settled, record, chaining);

        return;
      }

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
