import Link from "next/link";

import type { BoardgameId } from "@/lib/domain";
import { createBoardgameRepository } from "@/lib/supabase/repositories/boardgames";
import { createClient } from "@/lib/supabase/server";
import { ConfigsManager } from "./_components/ConfigsManager";

export default async function ConfigsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Resolve the boardgame name server-side (via the repository adapter) so the
  // title clearly states whose configs these are.
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
          {boardgame ? `Configurations — ${boardgame.name}` : "Configurations"}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Des réglages nommés pour ce jeu, utilisables au lancement d&apos;une
          partie.
        </p>
      </header>

      <ConfigsManager boardgameId={id as BoardgameId} />
    </main>
  );
}
