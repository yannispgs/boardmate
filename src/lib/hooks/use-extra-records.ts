"use client";

import type { GameStatsRecord, PopulatedGame } from "@/lib/domain";
import { playedExtensions } from "@/lib/game/extensions";
import {
  type ExtraRecordTaken,
  extraRecordsTaken,
} from "@/lib/game/ladder-records";
import { useGameStats } from "./use-game-stats";

/**
 * The extra records the party on screen has just taken — Phase 10's heaviest
 * manche and smallest win — read against every party already in the books.
 * Empty on every game that keeps none.
 *
 * Mount it only at the end of a game: it pulls the whole history down.
 */
export function useExtraRecords(game: PopulatedGame): ExtraRecordTaken[] {
  const { records } = useGameStats();
  const extras = game.boardgame.scoring?.extraRecords ?? [];

  if (extras.length === 0) {
    return [];
  }

  const party = {
    gameId: game.id,
    boardgameId: game.boardgameId,
    extensions: playedExtensions(game.extensions),
    stageScores: game.stageScores,
    players: game.players.map(p => ({
      playerId: p.playerId,
      name: p.player.name,
      isWinner: p.isWinner,
      score: p.score,
    })),
  } as unknown as GameStatsRecord;

  return extraRecordsTaken(
    extras,
    party,
    records,
    game.boardgame.scoring?.playerCountSensitive === true,
  );
}
