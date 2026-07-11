import type { Metadata } from "next";
import Link from "next/link";

import { StatsExplorer } from "./_components/StatsExplorer";

export const metadata: Metadata = {
  title: "Statistiques — Boardmate",
};

export default function StatsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Accueil
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Statistiques</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Les moyennes de toutes les parties terminées, par joueur ou par jeu.
        </p>
      </header>

      <StatsExplorer />
    </main>
  );
}
