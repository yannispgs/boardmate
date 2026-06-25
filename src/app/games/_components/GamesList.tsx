"use client";

import Link from "next/link";

import type { BoardgameId } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useGames } from "@/lib/hooks/use-games";

export function GamesList() {
  const { games, loading, error } = useGames("ongoing");
  const { boardgames } = useBoardgames();

  const nameOf = (id: BoardgameId) =>
    boardgames.find(b => b.id === id)?.name ?? "Partie";

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
        <ul className="flex flex-col gap-2">
          {games.map(game => (
            <li key={game.id}>
              <Link
                href={`/games/${game.id}/play`}
                className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-indigo-400 dark:border-white/10 dark:bg-zinc-900"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {nameOf(game.boardgameId)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Manche {game.round} · tour {game.turn} ·{" "}
                    {new Date(game.startedAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  Reprendre
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
