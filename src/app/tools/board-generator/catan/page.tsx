import type { Metadata } from "next";
import Link from "next/link";

import { CatanBoardGenerator } from "@/components/catan/CatanBoardGenerator";

export const metadata: Metadata = {
  title: "Plateau Catan — Boardmate",
};

export default function CatanBoardPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/tools/board-generator"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Générer un plateau
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Catan - Base</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Un plateau aléatoire et équilibré pour le jeu de base (3–4 joueurs),
          prêt à recopier sur la table.
        </p>
      </header>

      <CatanBoardGenerator />
    </main>
  );
}
