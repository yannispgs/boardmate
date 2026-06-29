import type { Metadata } from "next";
import Link from "next/link";

import { GamesList } from "./_components/GamesList";

export const metadata: Metadata = {
  title: "Parties — Boardmate",
};

export default function GamesPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
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
      </header>

      <GamesList />
    </main>
  );
}
