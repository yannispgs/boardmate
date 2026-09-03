"use client";

import { useMemo } from "react";

import type { GameStatsRecord, PlayerId, PopulatedGame } from "@/lib/domain";
import type {
  PlayerRecap,
  RecapParty,
  RecapScope,
  RecapSetup,
} from "@/lib/game/player-recap";
import { canCompareByTable, playerRecaps } from "@/lib/game/player-recap";
import { tracksPlayerTurns } from "@/lib/game/turn-time";
import { useGameStats } from "./use-game-stats";

/** A recorded party, reduced to the handful of figures a recap reads on it. */
function partyOf(record: GameStatsRecord): RecapParty {
  return {
    gameId: record.gameId,
    boardgameId: record.boardgameId,
    winThreshold: record.winThreshold ?? null,
    rounds: record.rounds ?? 1,
    players: record.players.map(p => ({
      playerId: p.playerId,
      score: p.score,
      isWinner: p.isWinner,
    })),
    turns: record.turns.map(t => ({
      playerId: t.playerId,
      durationS: t.durationS,
    })),
  };
}

/**
 * The party on screen, in the same shape — read off the live game rather than
 * off the history, so the recap holds tonight even in the seconds before the
 * subscription brings the freshly closed party back down.
 */
function tonightOf(game: PopulatedGame): RecapParty {
  return {
    gameId: game.id,
    boardgameId: game.boardgameId,
    winThreshold: game.winThreshold,
    rounds: game.round,
    players: game.players.map(p => ({
      playerId: p.playerId,
      score: p.score,
      isWinner: p.isWinner,
    })),
    // A simultaneous round belongs to the whole table, so it owns no turn time
    // to hand anybody — it is dropped rather than credited to a seat.
    turns: game.turns.flatMap(t => {
      return t.playerId === null
        ? []
        : [{ playerId: t.playerId, durationS: t.durationS }];
    }),
  };
}

export interface UsePlayerRecaps {
  recaps: PlayerRecap[];
  /** Whether the « à nombre de joueurs égal » switch is worth offering. */
  byTable: boolean;
  loading: boolean;
}

/**
 * What each player of the party just ended did, measured against his **own**
 * past evenings on the same game.
 *
 * It reads the same history the records already pull down (`useGameStats`), so
 * mounting it next to the record banners costs no extra request — but it still
 * only belongs on the end-of-game screen, which is the one place that history
 * is wanted.
 */
export function usePlayerRecaps(
  game: PopulatedGame,
  scope: RecapScope,
): UsePlayerRecaps {
  const { records, loading } = useGameStats();

  return useMemo(() => {
    const tonight = tonightOf(game);
    const history = records.map(partyOf);
    const names = new Map<PlayerId, string>(
      game.players.map(p => [p.playerId, p.player.name]),
    );
    const setup: RecapSetup = {
      scoring: game.boardgame.scoring,
      timed: tracksPlayerTurns(game.boardgame),
    };

    return {
      recaps: playerRecaps({ tonight, history, names, setup, scope }),
      byTable: canCompareByTable(tonight, history, setup),
      loading,
    };
  }, [game, records, scope, loading]);
}
