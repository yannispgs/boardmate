"use client";

import { useMemo, useState } from "react";

import { StatTile } from "@/components/StatTile";
import type { BoardgameId, PlayerId } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import { computeGlobalStats } from "@/lib/game/global-stats";
import { useGameStats } from "@/lib/hooks/use-game-stats";
import { FilterChips } from "./FilterChips";
import { PlayerRankingList } from "./PlayerRankingList";

/** Unique `{id, name}` options, sorted by name — for the filter chip rows. */
function uniqueBy<T>(
  items: T[],
  id: (t: T) => string,
  name: (t: T) => string,
): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(id(item), name(item));
  }

  return [...map.entries()]
    .map(([value, label]) => ({ id: value, name: label }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function StatsExplorer() {
  const { records, loading, error } = useGameStats();
  const [boardgameIds, setBoardgameIds] = useState<string[]>([]);
  const [playerIds, setPlayerIds] = useState<string[]>([]);

  const gameOptions = useMemo(
    () =>
      uniqueBy(
        records,
        r => r.boardgameId,
        r => r.boardgameName,
      ),
    [records],
  );
  const playerOptions = useMemo(
    () =>
      uniqueBy(
        records.flatMap(r => r.players),
        p => p.playerId,
        p => p.name,
      ),
    [records],
  );

  const stats = useMemo(
    () =>
      computeGlobalStats(records, {
        boardgameIds: boardgameIds as BoardgameId[],
        playerIds: playerIds as PlayerId[],
      }),
    [records, boardgameIds, playerIds],
  );

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
      setter(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
      );

  if (loading) {
    return <p className="text-sm text-zinc-500">Chargement…</p>;
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aucune partie terminée pour l&apos;instant. Les statistiques
        s&apos;afficheront une fois des parties jouées.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <FilterChips
          label="Jeux"
          options={gameOptions}
          selected={boardgameIds}
          onToggle={toggle(setBoardgameIds)}
          onClear={() => setBoardgameIds([])}
        />
        <FilterChips
          label="Joueurs"
          options={playerOptions}
          selected={playerIds}
          onToggle={toggle(setPlayerIds)}
          onClear={() => setPlayerIds([])}
        />
      </div>

      {stats.gameCount === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucune partie ne correspond à ces filtres.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Parties" value={String(stats.gameCount)} accent />
            <StatTile
              label="Temps de jeu moy."
              value={formatDuration(stats.avgActiveS)}
            />
            <StatTile label="Tours moy." value={stats.avgRounds.toFixed(1)} />
            <StatTile
              label="Tour moy."
              value={formatDuration(stats.avgTurnS)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Classement des joueurs — meilleur taux de victoire d&apos;abord
            </h2>
            <PlayerRankingList players={stats.players} />
          </div>
        </>
      )}
    </div>
  );
}
