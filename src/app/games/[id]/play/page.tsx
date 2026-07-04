import type { Metadata } from "next";
import Link from "next/link";

import type { GameId } from "@/lib/domain";
import { PlayScreen } from "./_components/PlayScreen";

export const metadata: Metadata = {
  title: "Partie en cours — Boardmate",
};

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="dark mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 bg-zinc-950 px-6 py-10 text-zinc-100">
      <header className="flex flex-col gap-1">
        <Link
          href="/games"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Parties
        </Link>
      </header>

      <PlayScreen gameId={id as GameId} />
    </main>
  );
}
