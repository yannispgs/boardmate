"use client";

import type { PopulatedGame } from "@/lib/domain";
import { resolveTieBreak, tieBreakRecord } from "@/lib/game/tie-break";
import { LiveEndPrompt } from "./LiveEndPrompt";
import { namedPlayers } from "./named-players";
import { ScorePanel } from "./ScorePanel";
import type { EndFlowState } from "./use-end-flow";
import type { LiveScores } from "./use-live-scores";

/**
 * Live scoring: the running totals the table keeps up to date as it plays, and
 * the prompt that offers to end the game as soon as one of them reaches the
 * score it is won on. Games scored at the end get neither.
 */
export function LiveScoreSection({
  game,
  live,
  flow,
  disabled,
}: Readonly<{
  game: PopulatedGame;
  live: LiveScores;
  flow: EndFlowState;
  disabled: boolean;
}>) {
  const scoring = game.boardgame.scoring;

  if (scoring?.timing !== "live") {
    return null;
  }

  // Who the target-reached prompt proposes as winner, already resolved through
  // the game's own rules (Catan hands the tie to whoever holds the turn).
  const outcome = resolveTieBreak(
    game.players.map(p => ({
      playerId: p.playerId,
      score: live.scores[p.playerId] ?? 0,
    })),
    "highest",
    scoring.tieBreak ?? [],
    { currentPlayerId: game.currentPlayerId },
  );

  return (
    <>
      <ScorePanel
        players={game.players}
        scores={live.scores}
        threshold={game.winThreshold}
        allowNegative={scoring.allowNegative ?? false}
        minScore={scoring.minScore ?? 0}
        onSet={live.setScore}
        disabled={disabled}
        open={live.panelOpen}
        onOpenChange={live.setPanelOpen}
      />

      {live.promptOpen ? (
        <LiveEndPrompt
          players={namedPlayers(game)}
          scores={live.scores}
          defaultWinnerIds={outcome.winners}
          tieBreak={tieBreakRecord(outcome)}
          onEnd={winnerIds => {
            live.setPromptOpen(false);
            // Persist every player's live score, not just the winner's, so no
            // one is left unscored in the finished game.
            flow.endWithLiveScores(
              winnerIds,
              game.players.map(p => ({
                playerId: p.playerId,
                score: live.scores[p.playerId] ?? 0,
              })),
              tieBreakRecord(outcome),
            );
          }}
          onCancel={() => live.setPromptOpen(false)}
          disabled={disabled}
        />
      ) : null}
    </>
  );
}
