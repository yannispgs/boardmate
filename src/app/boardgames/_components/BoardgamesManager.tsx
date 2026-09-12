"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorText } from "@/components/ErrorText";
import { ListState } from "@/components/ListState";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import type { Boardgame } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useMyPermissions } from "@/lib/hooks/use-my-permissions";
import { BoardgameCardList } from "./BoardgameCardList";

export function BoardgamesManager() {
  const { boardgames, loading, error, setActive } = useBoardgames();

  const active = boardgames.filter(b => b.isActive);
  const inactive = boardgames.filter(b => !b.isActive);

  const [actionError, setActionError] = useState<string | null>(null);
  // Hiding a game and bringing it back are two separate rights, so the two
  // lists do not necessarily carry the same button.
  const { can } = useMyPermissions();
  const { requestConfirm, confirmDialog } = useConfirm();

  async function deactivate(b: Boardgame) {
    setActionError(null);
    try {
      await setActive(b.id, false);
    } catch {
      setActionError("Désactivation impossible. Réessaie.");
    }
  }

  function handleToggle(b: Boardgame, nextActive: boolean) {
    // Reactivating, or hiding a boardgame that was never played, is harmless —
    // do it straight away. Only confirm when deactivating one with games, since
    // it can no longer be deleted.
    if (nextActive) {
      setActive(b.id, true);
      return;
    }
    if (!b.hasGames) {
      deactivate(b);
      return;
    }
    requestConfirm({
      message:
        `Désactiver « ${b.name} » ?\n\n` +
        "Des parties y sont déjà enregistrées : il sortira des sélections mais " +
        "gardera son historique. Tu pourras le réactiver à tout moment.",
      confirmLabel: "Désactiver",
      onConfirm: () => deactivate(b),
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ErrorText message={actionError} />

      <ErrorText message={error} />

      {/* Only the list of games scrolls; the header above and the action bar
          below stay put. */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4">
        <ListState
          loading={loading}
          empty={boardgames.length === 0}
          emptyLabel={<>Aucun jeu pour l&apos;instant.</>}
        >
          <BoardgameCardList
            title="Jeux actifs"
            boardgames={active}
            onToggle={
              can("boardgames.disable")
                ? b => handleToggle(b, false)
                : undefined
            }
            actionLabel="Désactiver"
          />
          {inactive.length > 0 ? (
            <BoardgameCardList
              title="Désactivés"
              boardgames={inactive}
              onToggle={
                can("boardgames.enable")
                  ? b => handleToggle(b, true)
                  : undefined
              }
              actionLabel="Réactiver"
              dimmed
              collapsible
            />
          ) : null}
        </ListState>
      </div>

      {can("boardgames.create") ? (
        <StickyActionBar>
          <Link
            href="/boardgames/new"
            className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
          >
            + Ajouter un jeu
          </Link>
        </StickyActionBar>
      ) : null}

      {confirmDialog}
    </div>
  );
}
