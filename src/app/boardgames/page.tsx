import type { Metadata } from "next";
import Link from "next/link";

import { BoardgamesManager } from "./_components/BoardgamesManager";

export const metadata: Metadata = {
  title: "Jeux — Boardmate",
};

export default function BoardgamesPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Accueil
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Jeux</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          La ludothèque du groupe : nombre de joueurs, durée, logo et tags.
        </p>
      </header>

      <BoardgamesManager />
    </main>
  );
}
