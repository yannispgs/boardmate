"use client";

import { useMemo, useState } from "react";
import { MultiSelectField } from "@/components/MultiSelectField";
import { StatTile } from "@/components/StatTile";
import type { BoardgameId, GameStatsRecord, PlayerId } from "@/lib/domain";
import {
  boardgameOptions,
  computeGlobalStats,
  coPlayerOptions,
  filterRecords,
} from "@/lib/game/global-stats";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { PlayerDetail } from "./PlayerDetail";
import { PlayerRankingTable } from "./PlayerRankingTable";

/**
 * "Joueurs" tab: a ranking of every player's individual stats, over whatever
 * two filters leave in scope.
 *
 * The games filter subtracts — every boardgame counts until one is unticked.
 * The presence filter narrows — pick one or more players and only the games
 * where all of them played are counted (the whole ranking still shows; it just
 * reflects that subset of games). Tapping a player opens their detail.
 */
export function PlayersTab({
  records,
}: Readonly<{ records: GameStatsRecord[] }>) {
  const [droppedIds, setDroppedIds] = useState<BoardgameId[]>([]);
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<PlayerId | null>(null);
  const { boardgames } = useBoardgames();

  const games = useMemo(() => boardgameOptions(records), [records]);

  // Everything downstream reads this rather than `records`: the ranking, the
  // players the presence filter offers, and the detail behind a player.
  const scoped = useMemo(
    () => keptRecords(records, games, droppedIds),
    [records, games, droppedIds],
  );

  // Narrow the options to players who share a game with everyone already
  // picked, so the presence filter never selects an empty set of games.
  const options = useMemo(
    () => coPlayerOptions(scoped, presentIds),
    [scoped, presentIds],
  );

  const stats = useMemo(
    () => computeGlobalStats(scoped, { playerIds: presentIds as PlayerId[] }),
    [scoped, presentIds],
  );

  function dropGames(ids: BoardgameId[]) {
    // Unticking the last one would leave nothing to count, so it reads as no
    // filter at all instead: every game comes back, ticked.
    const dropped = ids.length === games.length ? [] : ids;
    const left = coPlayerOptions(keptRecords(records, games, dropped), []);

    setDroppedIds(dropped);
    // Somebody nobody played those games with would otherwise sit on in the
    // presence filter as a bare id, with nothing left to count.
    setPresentIds(current =>
      current.filter(id => left.some(option => option.id === id)),
    );
  }

  const detail = detailId
    ? (stats.players.find(p => p.playerId === detailId) ?? null)
    : null;

  if (detail) {
    return (
      <PlayerDetail
        player={detail}
        records={scoped}
        boardgames={boardgames}
        onBack={() => setDetailId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Only the game count is meaningful globally; time/turn/score means mix
          boardgames, so they live in the per-game (Jeux) tab. */}
      <div className="w-40">
        <StatTile
          label="Parties terminées"
          value={String(stats.gameCount)}
          accent
        />
      </div>

      <div className="flex flex-col gap-1">
        <MultiSelectField
          label="Jeux pris en compte"
          options={games}
          selected={droppedIds}
          onChange={dropGames}
          excluding
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Tous les jeux comptent ; décoche ceux à laisser de côté.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <MultiSelectField
          label="Avec les joueurs"
          options={options}
          selected={presentIds}
          onChange={setPresentIds}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Ne garde que les parties où ces joueurs étaient présents.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Classement des joueurs
        </h2>
        <PlayerRankingTable players={stats.players} onSelect={setDetailId} />
      </div>
    </div>
  );
}

/** The games left once the unticked boardgames are taken out. */
function keptRecords(
  records: GameStatsRecord[],
  games: { id: BoardgameId }[],
  droppedIds: BoardgameId[],
): GameStatsRecord[] {
  return filterRecords(records, {
    boardgameIds: games
      .filter(game => !droppedIds.includes(game.id))
      .map(game => game.id),
  });
}
