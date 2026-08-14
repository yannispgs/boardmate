"use client";

import { useState } from "react";
import type { PlayerId, PopulatedGame } from "@/lib/domain";
import { clampScore } from "@/lib/game/scoring";
import {
  closingRound,
  roundPlayedOut,
  stopsAtRoundEnd,
} from "@/lib/game/stop-condition";
import { turnsPerRound } from "@/lib/game/turn";
import { getGameRepository } from "@/lib/repositories";
import type { PlayGame } from "./use-play-game";

export interface LiveScores {
  /** Every player's running total, seeded from the game then owned here so it
   * survives the reloads a turn brings. */
  scores: Record<string, number>;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  /** The "target reached" prompt, which offers to end the game there. */
  promptOpen: boolean;
  setPromptOpen: (open: boolean) => void;
  /**
   * True while the game is playing out the lap that will end it — the table has
   * to be told, since the app is holding an ending it can already see coming.
   */
  lastLap: boolean;
  /**
   * That same lap, as a number, for the turn order to draw its finish line on —
   * null for a game with no ending in sight.
   */
  closingRound: number | null;
  setScore: (playerId: PlayerId, raw: number) => Promise<void>;
}

/**
 * Live scoring (Catan and the like): the table keeps every player's total up to
 * date as it plays, and the app steps in when someone reaches the score the
 * game is won on — on the spot, or once the lap has been played out for a game
 * that owes the others an answer (Splendor).
 */
export function useLiveScores(game: PopulatedGame, play: PlayGame): LiveScores {
  const repo = getGameRepository();
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(game.players.map(p => [p.playerId, p.score ?? 0])),
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  // The closing lap already asked about, so « Continuer la partie » is taken as
  // an answer instead of being asked again on the next turn.
  const [asked, setAsked] = useState<number | null>(null);

  const scoring = game.boardgame.scoring;
  const perRound = turnsPerRound(game.boardgame.turnMode, game.players.length);
  const waits = stopsAtRoundEnd(scoring);
  // Which lap the game dies at the end of, from what is recorded — so this
  // survives a reload mid-lap. Null for every game that ends on the spot.
  const closing = waits
    ? closingRound(game.scoreEvents, Object.values(scores), game.winThreshold)
    : null;
  const stop = closing === null ? null : closing * perRound;

  // The lap is over: everybody has answered, so ask now. Derived while
  // rendering rather than from an effect — the prompt is a function of where
  // the turn is, not something that happens after the fact.
  if (roundPlayedOut(stop, game.turn) && asked !== stop) {
    setAsked(stop);
    setPromptOpen(true);
  }

  // Waved off, the ending is called off with it: the table said it keeps
  // playing, so the banner and the turn order's finish flag have to stop
  // announcing an end that is not coming — and the ribbon would otherwise be
  // asked to draw a finish line the current turn has already gone past.
  const announced = asked === stop ? null : closing;

  // Sets a player's absolute total (clamped for positive-only games), persists
  // it, then offers to end when the target is reached OR exceeded — a turn can
  // bring several points at once.
  async function setScore(playerId: PlayerId, raw: number) {
    const next = clampScore(raw, game.boardgame.scoring);

    setScores(s => ({ ...s, [playerId]: next }));

    const saved = await play.report("Impossible d'enregistrer le score.", () =>
      repo.setScore(game.id, playerId, next, game.round),
    );

    if (!saved || game.winThreshold === null || next < game.winThreshold) {
      return;
    }

    // A game that plays the lap out keeps going, whoever crossed the target —
    // the player who just scored is owed the rest of his turn as much as the
    // others are owed theirs, so the game only stops once the turn has moved
    // past the lap. Reloading is what makes the closing lap known: it is read
    // off what is recorded, and nothing else reloads before the turn advances.
    if (waits) {
      await play.reload();

      return;
    }

    // Close the score sheet and let the end prompt (which can override the
    // winner) take over — the two modals never stack.
    setPanelOpen(false);
    setPromptOpen(true);
  }

  return {
    scores,
    panelOpen,
    setPanelOpen,
    promptOpen,
    setPromptOpen,
    lastLap: announced !== null,
    closingRound: announced,
    setScore,
  };
}
