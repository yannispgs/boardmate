"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { TrashIcon } from "@/components/icons";
import { dangerIconButtonClass } from "@/components/ui";
import { useConfirm } from "@/components/use-confirm";
import type { BoardgameId } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { BoardgameInUseError } from "@/lib/repositories/errors";

/**
 * Deleting a game, at the bottom of its own settings. It used to be a small
 * destructive target on a row of the list; here it is somewhere you came on
 * purpose, and it can say what deleting actually costs before you ask for it.
 */
export function DangerZone({
  boardgameId,
  name,
}: Readonly<{
  boardgameId: BoardgameId;
  name: string;
}>) {
  const router = useRouter();
  const { removeBoardgame } = useBoardgames();
  const { requestConfirm, confirmDialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);

    try {
      await removeBoardgame(boardgameId);
      router.push("/boardgames");
    } catch (e) {
      if (e instanceof BoardgameInUseError) {
        setError(
          `« ${name} » a déjà des parties enregistrées : impossible de le ` +
            "supprimer. Tu peux le désactiver à la place, depuis la liste des " +
            "jeux.",
        );
      } else {
        setError("Suppression impossible. Réessaie.");
      }
    }
  }

  function confirmRemoval() {
    requestConfirm({
      message: `Supprimer « ${name} » ? Cette action est définitive.`,
      confirmLabel: "Supprimer",
      onConfirm: remove,
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
            Supprimer ce jeu
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Définitif, et impossible dès qu&apos;une partie y est enregistrée —
            dans ce cas, désactive-le depuis la liste des jeux.
          </p>
        </div>
        <button
          type="button"
          onClick={confirmRemoval}
          aria-label={`Supprimer ${name}`}
          title="Supprimer"
          className={dangerIconButtonClass}
        >
          <TrashIcon />
        </button>
      </div>

      <ErrorText message={error} />

      {confirmDialog}
    </section>
  );
}
