import type { Metadata } from "next";
import Link from "next/link";

import { BoardgamesManager } from "./_components/BoardgamesManager";

export const metadata: Metadata = {
  title: "Jeux — Boardmate",
};

export default function BoardgamesPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      <header className="flex shrink-0 flex-col gap-1 pt-10 pb-4">
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
