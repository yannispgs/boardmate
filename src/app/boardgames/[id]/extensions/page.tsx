import type { Metadata } from "next";
import Link from "next/link";

import type { BoardgameId } from "@/lib/domain";
import { extensionsBackLink } from "@/lib/game/scenario-editor";
import { createBoardgameRepository } from "@/lib/supabase/repositories/boardgames";
import { createExtensionRepository } from "@/lib/supabase/repositories/extensions";
import { createClient } from "@/lib/supabase/server";
import { ExtensionsBrowser } from "../_components/ExtensionsBrowser";

export const metadata: Metadata = {
  title: "Extensions d'un jeu — Boardmate",
};

/**
 * The extensions of one base game, one tab per extension: what the extension
 * changes and, for a scenario-based one, every scenario with the score to
 * reach — managed here when the app knows how to author them (Catan - Marins).
 */
export default async function BoardgameExtensionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);

  // The screen that sent us here, so leaving goes back the way we came in.
  const back = extensionsBackLink(from);

  // Extensions are seeded reference data — read them server-side so the tabs
  // render filled in, with no client round-trip.
  const supabase = await createClient();
  const [boardgame, extensions] = await Promise.all([
    createBoardgameRepository(supabase)
      .get(id as BoardgameId)
      .catch(() => null),
    createExtensionRepository(supabase).listByBase(id as BoardgameId),
  ]);

  return (
    // Wider than the other game screens: the scenario editor lives here, and it
    // needs the room for its map. The reading blocks keep their own column.
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex max-w-2xl flex-col gap-1">
        <Link
          href={back.href}
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {back.label}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          {boardgame ? `Extensions — ${boardgame.name}` : "Extensions"}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ce que chaque extension change, et ses scénarios.
        </p>
      </header>

      <ExtensionsBrowser extensions={extensions} />
    </main>
  );
}
