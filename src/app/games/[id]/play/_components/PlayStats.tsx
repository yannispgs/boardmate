"use client";

import type { PopulatedGame } from "@/lib/domain";
import { StatsPanel } from "./StatsPanel";

/**
 * The in-game stats panel, which is all about time. Two games get none: a
 * simultaneous one, which has no per-player turns to compare, and one counted
 * in manches the table closes itself, which times nothing at all — its panel
 * would open on empty tiles for the whole game.
 */
export function PlayStats({
  game,
  rolls,
}: Readonly<{ game: PopulatedGame; rolls: number[] }>) {
  const untimed = game.boardgame.stages?.advance === "manual";

  if (game.boardgame.turnMode === "simultaneous" || untimed) {
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
