import type { Metadata } from "next";
import Link from "next/link";

import type { BoardgameId } from "@/lib/domain";
import { createBoardgameRepository } from "@/lib/supabase/repositories/boardgames";
import { createClient } from "@/lib/supabase/server";
import { BoardgameFormPage } from "../../_components/BoardgameFormPage";
import { ConfigsManager } from "../_components/ConfigsManager";

export const metadata: Metadata = {
  title: "Réglages d'un jeu — Boardmate",
};

export default async function EditBoardgamePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  // Resolve the boardgame name server-side (via the repository adapter) so the
  // title names the game whose settings these are.
  const supabase = await createClient();
  const boardgame = await createBoardgameRepository(supabase)
    .get(id as BoardgameId)
    .catch(() => null);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/boardgames"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Jeux
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          {boardgame ? `Réglages — ${boardgame.name}` : "Réglages"}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Les informations du jeu et ses configurations, au même endroit.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Informations du jeu
        </h2>
        <BoardgameFormPage boardgameId={id as BoardgameId} />
      </section>

      <ConfigsManager boardgameId={id as BoardgameId} />
    </main>
  );
}
