import type { Metadata } from "next";
import Link from "next/link";

import { WheelTool } from "./_components/WheelTool";

export const metadata: Metadata = {
  title: "Roue de la chance — Boardmate",
};

export default function WheelPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Accueil
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          Roue de la chance
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tire au sort parmi les entrées de ton choix — un premier joueur, une
          équipe… sans lancer de partie ni toucher aux statistiques.
        </p>
      </header>

      <WheelTool />
    </main>
  );
}
