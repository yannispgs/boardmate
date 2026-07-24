import type { Metadata } from "next";
import Link from "next/link";

import { FinishedGameForm } from "./_components/FinishedGameForm";

export const metadata: Metadata = {
  title: "Partie terminée — Boardmate",
};

export default function FinishedGamePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/games"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Parties
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          Ajouter une partie terminée
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Enregistre une partie déjà jouée pour qu&apos;elle compte dans les
          statistiques du jeu et des joueurs. Pas d&apos;historique de tours ni
          de dés — seulement le résultat final.
        </p>
      </header>

      <FinishedGameForm />
    </main>
  );
}
