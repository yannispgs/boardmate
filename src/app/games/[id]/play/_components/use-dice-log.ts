"use client";

import { useState } from "react";
import type { PopulatedGame } from "@/lib/domain";
import { getGameRepository } from "@/lib/repositories";
import type { PlayGame } from "./use-play-game";

export interface DiceLog {
  /** The rolled values in order, owned locally so a tap shows instantly. */
  rolls: number[];
  /** A tap was refused because the per-turn cap is reached; shown until the
   * next turn. */
  capNotice: boolean;
  roll: (value: number) => Promise<void>;
}

/** The dice tracking log (Catan): one tap per roll, appended and persisted. */
export function useDiceLog(game: PopulatedGame, play: PlayGame): DiceLog {
  const repo = getGameRepository();
  // Rolls only ever append, so the copy seeded here stays authoritative across
  // the reloads a turn brings.
  const [rolls, setRolls] = useState<number[]>(() =>
    game.diceRolls.map(d => d.value),
  );
  const [capNotice, setCapNotice] = useState(false);

  // The notice lasts only until the next turn, which raises the cap with it —
  // adjusted while rendering rather than in an effect, so the notice is already
  // gone on the first paint of the new turn.
  const turn = game.turn;
  const [noticeTurn, setNoticeTurn] = useState(turn);

  if (noticeTurn !== turn) {
    setNoticeTurn(turn);
    setCapNotice(false);
  }

  async function roll(value: number) {
    // Cap the log at the number of player-turns played so far: it lets you
    // backfill missed rolls yet stops a stuck button from flooding the data.
    // Tapping past the cap records nothing and surfaces the explanation (only
    // then — not merely on reaching the cap).
    if (rolls.length >= turn) {
      setCapNotice(true);

      return;
    }

    setRolls([...rolls, value]);
    await play.report("Impossible d'enregistrer le lancer.", () =>
      repo.addDiceRoll(game.id, value),
    );
  }

  return { rolls, capNotice, roll };
}
