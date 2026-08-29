"use client";

import type { PlayerId, PopulatedGame } from "@/lib/domain";
import { extensionTab, playedExtensions } from "@/lib/game/extensions";
import type { ScoreRecord } from "@/lib/game/score-records";
import { scoreRecords } from "@/lib/game/score-records";
import { useGameStats } from "./use-game-stats";

/**
 * The records the party on screen has just taken, read against every finished
 * party in the books. Mount it only where the answer is wanted — the end of a
 * game — since it pulls the whole history down to answer.
 *
 * `standings` are the totals as they are about to be shown, so the reveal marks
 * the same score the reveal announces, and `winners` who the table crowned —
 * the game's record follows the victory, not the scoreboard.
 */
export function useScoreRecords(
  game: PopulatedGame,
  standings: ReadonlyArray<{ playerId: PlayerId; total: number }>,
  winners: readonly PlayerId[],
): Map<PlayerId, ScoreRecord[]> {
  const { records } = useGameStats();

  return scoreRecords({
    scoring: game.boardgame.scoring,
    boardgameId: game.boardgameId,
    gameId: game.id,
    setup: extensionTab(playedExtensions(game.extensions)),
    standings,
    winners,
    history: records.map(r => ({
      gameId: r.gameId,
      boardgameId: r.boardgameId,
      setup: extensionTab(r.extensions ?? []),
      players: r.players.map(p => ({
        playerId: p.playerId,
        score: p.score,
      })),
    })),
  });
}

/**
 * The same records for a party **already in the books**: its standings and its
 * winners are read off the recorded game rather than off a reveal in progress,
 * so any screen showing a finished party gets them without rebuilding either.
 */
export function useRecordsOfGame(
  game: PopulatedGame,
): Map<PlayerId, ScoreRecord[]> {
  return useScoreRecords(
    game,
    game.players.map(p => ({ playerId: p.playerId, total: p.score ?? 0 })),
    game.players.filter(p => p.isWinner).map(p => p.playerId),
  );
}
