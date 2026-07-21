"use client";

import { useMemo, useState } from "react";

import { StatTile } from "@/components/StatTile";
import type { GameStatsRecord, PlayerId } from "@/lib/domain";
import { computeGlobalStats } from "@/lib/game/global-stats";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { MultiSelectField } from "./MultiSelectField";
import { PlayerDetail } from "./PlayerDetail";
import { PlayerRankingTable } from "./PlayerRankingTable";

/** Every player that appears in the records, sorted by name — filter options. */
function playerOptions(records: GameStatsRecord[]) {
  const map = new Map<string, string>();
  for (const r of records) {
    for (const p of r.players) {
      map.set(p.playerId, p.name);
    }
  }

  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * "Joueurs" tab: a ranking of every player's individual stats. The filter is a
 * presence filter — pick one or more players and the stats are recomputed from
 * only the games where all of them played (empty = every game). The whole
 * ranking still shows; it just reflects that subset of games. Tapping a player
 * opens their detail.
 */
export function PlayersTab({ records }: { records: GameStatsRecord[] }) {
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<PlayerId | null>(null);
  const { boardgames } = useBoardgames();

  const options = useMemo(() => playerOptions(records), [records]);

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
