"use client";

import { useMemo, useState } from "react";

import { StatTile } from "@/components/StatTile";
import type { GameStatsRecord, PlayerId } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import { computeGlobalStats } from "@/lib/game/global-stats";
import { MultiSelectField } from "./MultiSelectField";
import { PlayerDetail } from "./PlayerDetail";
import { PlayerRankingList } from "./PlayerRankingList";

/**
 * "Joueurs" tab: global by default — overall averages plus a ranking of every
 * player's individual stats (win rate, games, most-played / best / worst game).
 * A search-select narrows which players are shown; tapping a player opens their
 * detailed stats.
 */
export function PlayersTab({ records }: { records: GameStatsRecord[] }) {
  const [shownIds, setShownIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<PlayerId | null>(null);

  const stats = useMemo(() => computeGlobalStats(records), [records]);

  const playerOptions = useMemo(
    () => stats.players.map(p => ({ id: p.playerId, name: p.name })),
    [stats],
  );

  const detail = detailId
    ? (stats.players.find(p => p.playerId === detailId) ?? null)
    : null;

  if (detail) {
    return <PlayerDetail player={detail} onBack={() => setDetailId(null)} />;
  }

  const ranking =
    shownIds.length === 0
      ? stats.players
      : stats.players.filter(p => shownIds.includes(p.playerId));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Parties" value={String(stats.gameCount)} accent />
        <StatTile
          label="Temps de jeu moy."
          value={formatDuration(stats.avgActiveS)}
        />
        <StatTile label="Tours moy." value={stats.avgRounds.toFixed(1)} />
        <StatTile label="Tour moy." value={formatDuration(stats.avgTurnS)} />
      </div>

      <MultiSelectField
        label="Joueurs"
        options={playerOptions}
        selected={shownIds}
        onChange={setShownIds}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Classement des joueurs — meilleur taux de victoire d&apos;abord
        </h2>
        <PlayerRankingList players={ranking} onSelect={setDetailId} />
      </div>
    </div>
  );
}
