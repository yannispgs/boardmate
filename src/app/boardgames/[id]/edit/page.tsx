import type { Metadata } from "next";

import { getMyPermissions } from "@/lib/auth/permissions";
import type { BoardgameId } from "@/lib/domain";
import { createBoardgameRepository } from "@/lib/supabase/repositories/boardgames";
import { createClient } from "@/lib/supabase/server";
import { BoardgameFormPage } from "../../_components/BoardgameFormPage";
import { ConfigsManager } from "../_components/ConfigsManager";
import { DangerZone } from "../_components/DangerZone";

export const metadata: Metadata = {
  title: "Réglages d'un jeu — Boardmate",
};

export default async function EditBoardgamePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  // The name a deletion has to spell out before it is confirmed. The layout has
  // already proven the game exists, so a miss here is only a race with someone
  // deleting it in the next room.
  const supabase = await createClient();
  const [boardgame, mine] = await Promise.all([
    createBoardgameRepository(supabase)
      .get(id as BoardgameId)
      .catch(() => null),
    getMyPermissions(),
  ]);
  // Read here rather than in each child: this tab is nothing but write
  // controls, so without any of the three there is no tab left to draw.
  const mayEdit = mine.includes("boardgames.update");
  const mayScore = mine.includes("boardgames.updateScoring");
  const mayDelete = mine.includes("boardgames.delete");

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Les informations du jeu et ses configurations, au même endroit.
      </p>

      {/* Said once, in place of everything that is gone: an empty tab reads as
          a broken page, and the reader got here from the game's own row. */}
      {mayEdit || mayScore || mayDelete ? null : (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
          Ton compte n&apos;a pas les permissions pour modifier ce jeu. Demande
          à un administrateur de te les attribuer.
        </p>
      )}

      {mayEdit ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Informations du jeu
          </h2>
          <BoardgameFormPage boardgameId={id as BoardgameId} />
        </section>
      ) : null}

      {mayScore ? <ConfigsManager boardgameId={id as BoardgameId} /> : null}

      {boardgame === null || !mayDelete ? null : (
        <DangerZone boardgameId={id as BoardgameId} name={boardgame.name} />
      )}
    </div>
  );
}
