import type { Metadata } from "next";
import Link from "next/link";

import { BoardgameFormPage } from "../_components/BoardgameFormPage";

export const metadata: Metadata = {
  title: "Nouveau jeu — Boardmate",
};

export default function NewBoardgamePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/boardgames"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Jeux
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Nouveau jeu</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ajoute un jeu à la ludothèque du groupe.
        </p>
      </header>

      <BoardgameFormPage />
    </main>
  );
}
