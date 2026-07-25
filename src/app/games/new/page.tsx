import type { Metadata } from "next";
import Link from "next/link";

import { NewGameFunnel } from "./_components/NewGameFunnel";

export const metadata: Metadata = {
  title: "Nouvelle partie — Boardmate",
};

export default function NewGamePage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      <header className="flex shrink-0 flex-col gap-1 pt-10 pb-6">
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
