"use client";

import type { PlayerId, PopulatedGame } from "@/lib/domain";
import type { ScoreRecord } from "@/lib/game/score-records";
import { scoreRecords } from "@/lib/game/score-records";
import { useGameStats } from "./use-game-stats";

/**
 * The records the party on screen has just taken, read against every finished
 * party in the books. Mount it only where the answer is wanted — the end of a
 * game — since it pulls the whole history down to answer.
 *
 * `standings` are the totals as they are about to be shown, so the reveal marks
 * the same score the reveal announces.
 */
export function useScoreRecords(
  game: PopulatedGame,
  standings: ReadonlyArray<{ playerId: PlayerId; total: number }>,
): Map<PlayerId, ScoreRecord[]> {
  const { records } = useGameStats();

  return scoreRecords({
    scoring: game.boardgame.scoring,
    boardgameId: game.boardgameId,
    gameId: game.id,
    standings,
    history: records.map(r => ({
      gameId: r.gameId,
      boardgameId: r.boardgameId,
      players: r.players.map(p => ({
        playerId: p.playerId,
        score: p.score,
      })),
    })),
  });
}
