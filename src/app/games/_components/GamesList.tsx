"use client";

import Link from "next/link";

import type { BoardgameId } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useGames } from "@/lib/hooks/use-games";
import { GameCardList } from "./GameCardList";

export function GamesList() {
  const { games, loading, error } = useGames("ongoing");
  const { boardgames } = useBoardgames();

  const boardgameFor = (id: BoardgameId) => boardgames.find(b => b.id === id);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/games/new"
        className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
      >
        + Nouvelle partie
      </Link>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : games.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucune partie en cours. Lance-en une !
        </p>
      ) : (
        <GameCardList games={games} boardgameFor={boardgameFor} />
      )}
    </div>
  );
}
