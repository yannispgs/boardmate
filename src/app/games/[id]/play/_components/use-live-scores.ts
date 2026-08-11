"use client";

import { useState } from "react";
import type { PlayerId, PopulatedGame } from "@/lib/domain";
import { clampScore } from "@/lib/game/scoring";
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
  setScore: (playerId: PlayerId, raw: number) => Promise<void>;
}

/**
 * Live scoring (Catan and the like): the table keeps every player's total up to
 * date as it plays, and the app steps in when someone reaches the score the
 * game is won on.
 */
export function useLiveScores(game: PopulatedGame, play: PlayGame): LiveScores {
  const repo = getGameRepository();
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(game.players.map(p => [p.playerId, p.score ?? 0])),
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  // Sets a player's absolute total (clamped for positive-only games), persists
  // it, then offers to end when the target is reached OR exceeded — a turn can
  // bring several points at once.
  async function setScore(playerId: PlayerId, raw: number) {
    const next = clampScore(raw, game.boardgame.scoring);

    setScores(s => ({ ...s, [playerId]: next }));

    const saved = await play.report("Impossible d'enregistrer le score.", () =>
      repo.setScore(game.id, playerId, next, game.round),
    );

    if (saved && game.winThreshold !== null && next >= game.winThreshold) {
      // Close the score sheet and let the end prompt (which can override the
      // winner) take over — the two modals never stack.
      setPanelOpen(false);
      setPromptOpen(true);
    }
  }

  return {
    scores,
    panelOpen,
    setPanelOpen,
    promptOpen,
    setPromptOpen,
    setScore,
  };
}
