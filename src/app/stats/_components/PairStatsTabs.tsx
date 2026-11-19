"use client";

import { type ReactNode, useState } from "react";

import { TabButton, tabBarClass } from "@/components/TabButton";
import type { NeighbourBoard } from "@/lib/game/neighbour-stats";

import { DuoRanking } from "./DuoRanking";
import { NeighbourStats } from "./NeighbourStats";

type Tab = "players" | "duos" | "neighbours";

/**
 * A game scored in shared piles (Splito) has three stories to tell — who wins,
 * which pairs build well, what sitting next to someone is worth — and one long
 * page made them hard to tell apart. One at a time, under a tab each.
 */
export function PairStatsTabs({
  board,
  players,
}: Readonly<{
  board: NeighbourBoard;
  /** Everything about the players themselves: their table, then the rest. */
  players: ReactNode;
}>) {
  const [tab, setTab] = useState<Tab>("players");

  return (
    <>
      <div className={tabBarClass}>
        <TabButton active={tab === "players"} onClick={() => setTab("players")}>
          Joueurs
        </TabButton>
        <TabButton active={tab === "duos"} onClick={() => setTab("duos")}>
          Duos
        </TabButton>
        <TabButton
          active={tab === "neighbours"}
          onClick={() => setTab("neighbours")}
        >
          Voisins
        </TabButton>
      </div>

      {tab === "players" ? players : null}
      {tab === "duos" ? (
        <DuoRanking
          duos={board.duos}
          thinDuos={board.thinDuos}
          pileAverage={board.pileAverage}
        />
      ) : null}
      {tab === "neighbours" ? <NeighbourStats board={board} /> : null}
    </>
  );
}
