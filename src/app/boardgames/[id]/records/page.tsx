import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { BoardgameId } from "@/lib/domain";
import { createBoardgameRepository } from "@/lib/supabase/repositories/boardgames";
import { createExtensionRepository } from "@/lib/supabase/repositories/extensions";
import { createClient } from "@/lib/supabase/server";
import { RecordBoardView } from "../_components/RecordBoardView";

export const metadata: Metadata = {
  title: "Records d'un jeu — Boardmate",
};

/**
 * The records one game holds, and the ones nobody holds yet: a tab per set of
 * extensions, a line per table size, each carrying the mark standing there.
 *
 * The game and its extensions are reference data, so they are read server-side
 * and the grid renders already named; the parties themselves are pulled by the
 * client, where they stay in step with a game ending in another room.
 */
export default async function BoardgameRecordsPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const supabase = await createClient();
  const [boardgame, extensions] = await Promise.all([
    createBoardgameRepository(supabase)
      .get(id as BoardgameId)
      .catch(() => null),
    createExtensionRepository(supabase).listByBase(id as BoardgameId),
  ]);

  if (boardgame === null) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/boardgames"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Jeux
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          Records — {boardgame.name}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ce qui est détenu, et ce qu&apos;il reste à prendre.
        </p>
      </header>

      {/* `listByBase` already reads them in application order. */}
      <RecordBoardView
        boardgame={boardgame}
        extensions={extensions.map(e => e.name)}
      />
    </main>
  );
}
