import type { Metadata } from "next";

import type { BoardgameId } from "@/lib/domain";
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
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  // Extensions are seeded reference data — read them server-side so the tabs
  // render filled in, with no client round-trip.
  const supabase = await createClient();
  const extensions = await createExtensionRepository(supabase).listByBase(
    id as BoardgameId,
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
        Ce que chaque extension change, et ses scénarios.
      </p>

      <ExtensionsBrowser extensions={extensions} />
    </div>
  );
}
