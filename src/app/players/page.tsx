import type { Metadata } from "next";
import Link from "next/link";

import { PlayersManager } from "./_components/PlayersManager";

export const metadata: Metadata = {
  title: "Joueurs — Boardmate",
};

export default function PlayersPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      <header className="flex shrink-0 flex-col gap-1 pt-10 pb-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Accueil
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Joueurs</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Les joueurs désactivés sortent des sélections mais gardent leur
          historique.
        </p>
      </header>

      <PlayersManager />
    </main>
  );
}
