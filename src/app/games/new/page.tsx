import type { Metadata } from "next";
import Link from "next/link";

import { NewGameFunnel } from "./_components/NewGameFunnel";

export const metadata: Metadata = {
  title: "Nouvelle partie — Boardmate",
};

export default function NewGamePage() {
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
          Nouvelle partie
        </h1>
      </header>

      <NewGameFunnel />
    </main>
  );
}
