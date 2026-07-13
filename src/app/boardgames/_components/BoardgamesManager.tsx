"use client";

import Link from "next/link";
import { useState } from "react";

import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import type { Boardgame } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { BoardgameInUseError } from "@/lib/repositories/errors";
import { BoardgameCardList } from "./BoardgameCardList";

export function BoardgamesManager() {
  const { boardgames, loading, error, setActive, removeBoardgame } =
    useBoardgames();

  const active = boardgames.filter(b => b.isActive);
  const inactive = boardgames.filter(b => !b.isActive);

  const [actionError, setActionError] = useState<string | null>(null);
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

  function handleDelete(b: Boardgame) {
    requestConfirm({
      message: `Supprimer « ${b.name} » ? Cette action est définitive.`,
      confirmLabel: "Supprimer",
      onConfirm: () => deleteBoardgame(b),
    });
  }

  async function deleteBoardgame(b: Boardgame) {
    setActionError(null);
    try {
      await removeBoardgame(b.id);
    } catch (e) {
      if (e instanceof BoardgameInUseError) {
        setActionError(
          `« ${b.name} » a déjà des parties enregistrées : impossible de le ` +
            "supprimer. Tu peux le désactiver à la place.",
        );
      } else {
        setActionError("Suppression impossible. Réessaie.");
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {actionError ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {/* Existing boardgames first */}
      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : boardgames.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun jeu pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <BoardgameCardList
            title="Jeux actifs"
            boardgames={active}
            onToggle={b => handleToggle(b, false)}
            actionLabel="Désactiver"
            onDelete={handleDelete}
          />
          {inactive.length > 0 ? (
            <BoardgameCardList
              title="Désactivés"
              boardgames={inactive}
              onToggle={b => handleToggle(b, true)}
              actionLabel="Réactiver"
              onDelete={handleDelete}
              dimmed
              collapsible
            />
          ) : null}
        </div>
      )}

      <StickyActionBar>
        <Link
          href="/boardgames/new"
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
        >
          + Ajouter un jeu
        </Link>
      </StickyActionBar>

      {confirmDialog}
    </div>
  );
}
