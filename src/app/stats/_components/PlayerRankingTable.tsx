"use client";

import { useMemo, useState } from "react";

import type { PlayerId } from "@/lib/domain";
import type { PlayerAggregate } from "@/lib/game/global-stats";

type SortKey = "winRate" | "games" | "timeIndex";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "winRate", label: "Vict." },
  { key: "games", label: "Parties" },
  { key: "timeIndex", label: "Temps" },
];

function fmtIndex(index: number | null): string {
  return index === null ? "—" : String(Math.round(index));
}

/**
 * The player leaderboard as a compact, sortable table — one thin row per player
 * so it stays readable with many players. Column headers sort by win rate,
 * number of games (the default) or the time index; clicking the active column
 * flips the direction. Tapping a row opens that player's detail.
 */
export function PlayerRankingTable({
  players,
  onSelect,
}: {
  players: PlayerAggregate[];
  onSelect: (id: PlayerId) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("games");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const mul = dir === "desc" ? -1 : 1;
    const value = (p: PlayerAggregate) =>
      sortKey === "winRate"
        ? p.winRate
        : sortKey === "games"
          ? p.games
          : p.timeIndex;

    return [...players].sort((a, b) => {
      const av = value(a);
      const bv = value(b);

      // A missing time index always sorts last, whatever the direction.
      if (av === null && bv === null) {
        return a.name.localeCompare(b.name);
      }
      if (av === null) {
        return 1;
      }
      if (bv === null) {
        return -1;
      }

      return mul * (av - bv) || a.name.localeCompare(b.name);
    });
  }, [players, sortKey, dir]);

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setDir(d => (d === "desc" ? "asc" : "desc"));

      return;
    }

    setSortKey(key);
    setDir("desc");
  }

  const arrow = dir === "desc" ? "↓" : "↑";

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2 border-b border-black/10 bg-black/[0.02] px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
          <span className="w-5" />
          <span className="flex-1">Joueur</span>
          {COLUMNS.map(col => (
            <button
              key={col.key}
              type="button"
              onClick={() => sortBy(col.key)}
              className={`w-14 text-right transition ${
                sortKey === col.key
                  ? "font-semibold text-indigo-600 dark:text-indigo-400"
                  : ""
              }`}
            >
              {col.label}
              {sortKey === col.key ? ` ${arrow}` : ""}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-black/5 dark:divide-white/5">
          {sorted.map((p, i) => (
            <li key={p.playerId}>
              <button
                type="button"
                onClick={() => onSelect(p.playerId)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition [@media(hover:hover)]:hover:bg-black/[0.03] dark:[@media(hover:hover)]:hover:bg-white/[0.04]"
              >
                <span className="w-5 text-right text-xs tabular-nums text-zinc-400">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-medium">{p.name}</span>
                <span className="w-14 text-right font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                  {Math.round(p.winRate)}%
                </span>
                <span className="w-14 text-right tabular-nums">{p.games}</span>
                <span className="w-14 text-right tabular-nums">
                  {fmtIndex(p.timeIndex)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Temps : part du temps normalisée, 100 = temps attendu.
      </p>
    </div>
  );
}
