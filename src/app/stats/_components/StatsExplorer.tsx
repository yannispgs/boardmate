"use client";

import { useState } from "react";

import { useGameStats } from "@/lib/hooks/use-game-stats";
import { GamesTab } from "./GamesTab";
import { PlayersTab } from "./PlayersTab";

type Tab = "joueurs" | "jeux";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-indigo-700 shadow-sm dark:bg-zinc-700 dark:text-indigo-300"
          : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The statistics view: two tabs — "Joueurs" (default, per-player averages
 * across all games) and "Jeux" (pick a game, see its own averages). Both read
 * the same finished-game records and average them with `computeGlobalStats`.
 */
export function StatsExplorer() {
  const { records, loading, error } = useGameStats();
  const [tab, setTab] = useState<Tab>("joueurs");

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
      <div className="flex gap-1 rounded-xl border border-black/10 bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/[0.03]">
        <TabButton active={tab === "joueurs"} onClick={() => setTab("joueurs")}>
          Joueurs
        </TabButton>
        <TabButton active={tab === "jeux"} onClick={() => setTab("jeux")}>
          Jeux
        </TabButton>
      </div>

      {tab === "joueurs" ? (
        <PlayersTab records={records} />
      ) : (
        <GamesTab records={records} />
      )}
    </div>
  );
}
