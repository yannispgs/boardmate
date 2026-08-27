"use client";

import type { PopulatedGame } from "@/lib/domain";
import { tracksPlayerTime } from "@/lib/game/turn-time";
import { StatsPanel } from "./StatsPanel";

/**
 * The in-game stats panel, which is all about per-player time — so a game that
 * attributes none gets no panel, and no button offering to open one:
 *
 * - a **simultaneous** game (Splito) records one shared turn per round, owned
 *   by nobody: no share of the time belongs to anyone;
 * - an **untimed** game (Papayoo) records no turn at all. Its button used to
 *   sit there for the whole evening and open on the same « après le premier
 *   tour joué » line, since that first turn never comes.
 *
 * A game counted in manches the table closes itself (Odin) records none either,
 * and its manche board is already the summary.
 */
export function PlayStats({
  game,
  rolls,
}: Readonly<{ game: PopulatedGame; rolls: number[] }>) {
  const byHand = game.boardgame.stages?.advance === "manual";

  if (!tracksPlayerTime(game.boardgame) || byHand) {
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
