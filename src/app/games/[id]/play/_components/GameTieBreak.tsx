"use client";

import type { PopulatedGame } from "@/lib/domain";
import { winnerDirection } from "@/lib/game/scoring";
import { namedPlayers } from "./named-players";
import { TieBreakPrompt } from "./TieBreakPrompt";
import type { EndFlowState } from "./use-end-flow";

/**
 * The prompt that separates leaders who came out level, fed from the game and
 * the outcome the end flow is holding. It opens in two different places — over
 * the reveal for the games the app ranks, over the score form for the ones the
 * table typed the totals of — and asks exactly the same questions in both, so
 * it is described once here.
 */
export function GameTieBreak({
  game,
  flow,
  disabled,
}: Readonly<{
  game: PopulatedGame;
  flow: EndFlowState;
  disabled: boolean;
}>) {
  const outcome = flow.outcome;

  if (!flow.tieOpen || outcome === null) {
    return null;
  }

  const scoring = game.boardgame.scoring;

  return (
    <TieBreakPrompt
      players={namedPlayers(game)}
      scores={Object.fromEntries(
        outcome.scores.map(s => [s.playerId, s.score]),
      )}
      direction={scoring ? winnerDirection(scoring.winCondition) : "highest"}
      // The boardgame's own secondary rules; none means the only way out is a
      // shared victory.
      rules={scoring?.tieBreak ?? []}
      currentPlayerId={game.currentPlayerId}
      onConfirm={flow.settleTie}
      onCancel={() => flow.setTieOpen(false)}
      disabled={disabled}
    />
  );
}
