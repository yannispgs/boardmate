"use client";

import type { PopulatedGame } from "@/lib/domain";
import { playedExtensions } from "@/lib/game/extensions";
import { ladderRunOf, ladderRuns } from "@/lib/game/ladder-records";
import type { SpeedRecord } from "@/lib/game/speed-records";
import { speedRecord, speedRunOf, speedRuns } from "@/lib/game/speed-records";
import { useGameStats } from "./use-game-stats";

/**
 * The speed record the party on screen has just taken, read against every race
 * already in the books on the same game. Null nearly always — most parties beat
 * nothing, and most games hold no speed record at all.
 *
 * Two kinds of race: laps of the table to a score (Catan), or manches up a
 * ladder to its top rung (Phase 10).
 *
 * Mount it only where the answer is wanted (the end of a game): it pulls the
 * whole history down to answer, exactly like `useScoreRecords`.
 */
export function useSpeedRecord(game: PopulatedGame): SpeedRecord | null {
  const { records } = useGameStats();
  const scoring = game.boardgame.scoring;
  const stages = game.boardgame.stages;
  const winners = game.players.filter(p => p.isWinner).map(p => p.playerId);

  if (stages?.ladder !== undefined) {
    const run = ladderRunOf(stages, {
      gameId: game.id,
      boardgameId: game.boardgameId,
      playerIds: game.players.map(p => p.playerId),
      scores: game.stageScores,
      fixed: game.ladderFixed === true,
      extensions: playedExtensions(game.extensions),
      winners,
    });

    return speedRecord(run, ladderRuns(stages, game.boardgameId, records));
  }

  const run = speedRunOf(scoring, {
    gameId: game.id,
    boardgameId: game.boardgameId,
    rounds: game.round,
    played: game.turns.length > 0,
    playerCount: game.players.length,
    target: game.winThreshold,
    extensions: playedExtensions(game.extensions),
    winners,
  });

  return speedRecord(run, speedRuns(scoring, game.boardgameId, records));
}
