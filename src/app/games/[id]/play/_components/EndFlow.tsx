"use client";

import type { PlayerId, PopulatedGame } from "@/lib/domain";
import type { EndOutcome } from "@/lib/game/end-outcome";
import { winnerDirection } from "@/lib/game/scoring";
import { FinalScoreTable } from "./FinalScoreTable";
import { namedPlayers } from "./named-players";
import { PairScoreTable } from "./PairScoreTable";
import { RankingReveal } from "./RankingReveal";
import { TieBreakPrompt } from "./TieBreakPrompt";
import type { EndFlowState } from "./use-end-flow";

/**
 * What takes over the screen once the points are counted: the standings
 * climbing from the last place to the first, then — for the games scored on a
 * sheet — the sheet itself, laid out as it was filled in.
 */
export function EndFlow({
  game,
  flow,
  outcome,
  disabled,
  onDone,
}: Readonly<{
  game: PopulatedGame;
  flow: EndFlowState;
  outcome: EndOutcome;
  disabled: boolean;
  onDone: () => void;
}>) {
  const players = namedPlayers(game);

  if (flow.phase === "reveal") {
    return (
      <Reveal
        game={game}
        flow={flow}
        outcome={outcome}
        players={players}
        disabled={disabled}
      />
    );
  }

  if (outcome.piles) {
    return (
      <PairScoreTable
        seats={players}
        piles={outcome.piles}
        ranking={outcome.ranking}
        onDone={onDone}
      />
    );
  }

  return (
    <FinalScoreTable
      sheet={game.boardgame.scoring?.sheet ?? []}
      players={players}
      values={outcome.values ?? {}}
      ranking={outcome.ranking}
      onDone={onDone}
    />
  );
}

/** The standings, and the prompt that settles leaders who came out level. */
function Reveal({
  game,
  flow,
  outcome,
  players,
  disabled,
}: Readonly<{
  game: PopulatedGame;
  flow: EndFlowState;
  outcome: EndOutcome;
  players: Array<{ id: PlayerId; name: string }>;
  disabled: boolean;
}>) {
  // The boardgame's own secondary rules, for a game that ends level.
  const rules = game.boardgame.scoring?.tieBreak ?? [];
  const direction = game.boardgame.scoring
    ? winnerDirection(game.boardgame.scoring.winCondition)
    : "highest";

  return (
    <>
      <RankingReveal
        ranking={outcome.ranking}
        players={players}
        winners={outcome.winners}
        tieBreak={
          outcome.winners.length === 0
            ? {
                // No rule in the box means the reveal can only offer to share
                // the win, so the button says so rather than promising more.
                label: rules.length > 0 ? "Départager" : "Victoire partagée",
                onOpen: () => flow.setTieOpen(true),
              }
            : null
        }
        onDone={flow.leaveReveal}
      />

      {flow.tieOpen ? (
        <TieBreakPrompt
          players={players}
          scores={Object.fromEntries(
            outcome.scores.map(s => [s.playerId, s.score]),
          )}
          direction={direction}
          rules={rules}
          currentPlayerId={game.currentPlayerId}
          onConfirm={flow.settleTie}
          onCancel={() => flow.setTieOpen(false)}
          disabled={disabled}
        />
      ) : null}
    </>
  );
}
