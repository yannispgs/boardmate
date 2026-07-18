import type { Metadata } from "next";
import Link from "next/link";

import { GamesList } from "./_components/GamesList";

export const metadata: Metadata = {
  title: "Parties — Boardmate",
};

export default function GamesPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      <header className="flex shrink-0 flex-col gap-1 pt-10 pb-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Accueil
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Parties</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Les parties en cours. L&apos;historique des parties terminées arrivera
          avec les statistiques.
        </p>
        <Link
          href="/games/finished"
          className="mt-1 self-start rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          ＋ Ajouter une partie terminée
        </Link>
      </header>

      <GamesList />
    </main>
  );
}
