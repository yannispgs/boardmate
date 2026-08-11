"use client";

import type { PopulatedGame } from "@/lib/domain";
import { StatsPanel } from "./StatsPanel";

/**
 * The in-game stats panel. A simultaneous game has no per-player turns to
 * compare, so it gets none.
 */
export function PlayStats({
  game,
  rolls,
}: Readonly<{ game: PopulatedGame; rolls: number[] }>) {
  if (game.boardgame.turnMode === "simultaneous") {
    return null;
  }

  const spec = game.boardgame.dice;

  return (
    <StatsPanel
      players={game.players}
      turns={game.turns}
      currentRound={game.round}
      dice={spec ? { rolls, spec } : undefined}
    />
  );
}
