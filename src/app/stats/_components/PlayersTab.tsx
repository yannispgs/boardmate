"use client";

import { useMemo, useState } from "react";
import { MultiSelectField } from "@/components/MultiSelectField";
import { StatTile } from "@/components/StatTile";
import type { GameStatsRecord, PlayerId } from "@/lib/domain";
import { computeGlobalStats, coPlayerOptions } from "@/lib/game/global-stats";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { PlayerDetail } from "./PlayerDetail";
import { PlayerRankingTable } from "./PlayerRankingTable";

/**
 * "Joueurs" tab: a ranking of every player's individual stats. The filter is a
 * presence filter — pick one or more players and the stats are recomputed from
 * only the games where all of them played (empty = every game). The whole
 * ranking still shows; it just reflects that subset of games. Tapping a player
 * opens their detail.
 */
export function PlayersTab({
  records,
}: Readonly<{ records: GameStatsRecord[] }>) {
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<PlayerId | null>(null);
  const { boardgames } = useBoardgames();

  // Narrow the options to players who share a game with everyone already
  // picked, so the presence filter never selects an empty set of games.
  const options = useMemo(
    () => coPlayerOptions(records, presentIds),
    [records, presentIds],
  );

  const stats = useMemo(
    () => computeGlobalStats(records, { playerIds: presentIds as PlayerId[] }),
    [records, presentIds],
  );

  const detail = detailId
    ? (stats.players.find(p => p.playerId === detailId) ?? null)
    : null;

  if (detail) {
    return (
      <PlayerDetail
        player={detail}
        records={records}
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
