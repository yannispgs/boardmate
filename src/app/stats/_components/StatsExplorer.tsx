"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { TabButton, tabBarClass } from "@/components/TabButton";
import { useGameStats } from "@/lib/hooks/use-game-stats";
import { GamesTab } from "./GamesTab";
import { PlayersTab } from "./PlayersTab";

type Tab = "joueurs" | "jeux";

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
    return <ErrorText message={error} />;
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
      <div className={tabBarClass}>
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
