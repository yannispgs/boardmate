import type { Metadata } from "next";

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
  const boardgame = await createBoardgameRepository(supabase)
    .get(id as BoardgameId)
    .catch(() => null);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Les informations du jeu et ses configurations, au même endroit.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Informations du jeu
        </h2>
        <BoardgameFormPage boardgameId={id as BoardgameId} />
      </section>

      <ConfigsManager boardgameId={id as BoardgameId} />

      {boardgame === null ? null : (
        <DangerZone boardgameId={id as BoardgameId} name={boardgame.name} />
      )}
    </div>
  );
}
