"use client";

import { type FormEvent, useState } from "react";

import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import type { Player } from "@/lib/domain";
import { usePlayers } from "@/lib/hooks/use-players";
import {
  DuplicateNameError,
  PlayerInUseError,
} from "@/lib/repositories/errors";
import { PlayerCardList } from "./PlayerCardList";

const normalize = (s: string) => s.trim().toLowerCase();

export function PlayersManager() {
  const { players, loading, error, addPlayer, setActive, removePlayer } =
    usePlayers();
  const [name, setName] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // In-app confirmation (replaces window.confirm, which browsers suppress).
  const { requestConfirm, confirmDialog } = useConfirm();

  const active = players.filter(p => p.isActive);
  const inactive = players.filter(p => !p.isActive);

  function closeForm() {
    setName("");
    setNameError(null);
    setFormOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    // Reject a duplicate name up front (case/space-insensitive).
    if (players.some(p => normalize(p.name) === normalize(trimmed))) {
      setNameError("Ce nom est déjà pris.");
      return;
    }
    setNameError(null);

    // Players can only be deleted before they've played — confirm first.
    requestConfirm({
      message:
        `Créer le joueur « ${trimmed} » ?\n\n` +
        "Un joueur ne pourra plus être supprimé dès qu'il aura participé à " +
        "une partie (il pourra seulement être désactivé).",
      confirmLabel: "Créer le joueur",
      onConfirm: () => createPlayer(trimmed),
    });
  }

  async function createPlayer(trimmed: string) {
    setSubmitting(true);
    setActionError(null);
    try {
      await addPlayer({ name: trimmed });
      closeForm();
    } catch (e) {
      // Safety net if someone else took the name between the check and submit.
      if (e instanceof DuplicateNameError) {
        setNameError("Ce nom est déjà pris.");
      } else {
        setActionError("Ajout impossible. Réessaie.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(player: Player) {
    setActionError(null);
    try {
      await setActive(player.id, false);
    } catch {
      setActionError("Désactivation impossible. Réessaie.");
    }
  }

  function handleToggle(player: Player, nextActive: boolean) {
    // Reactivating, or hiding a player who never played, is harmless — do it
    // straight away. Only confirm when deactivating a player with history,
    // since they can no longer be deleted.
    if (nextActive) {
      setActive(player.id, true);
      return;
    }
    if (!player.hasPlayed) {
      deactivate(player);
      return;
    }
    requestConfirm({
      message:
        `Désactiver « ${player.name} » ?\n\n` +
        "Il a déjà participé à une partie : il sortira des sélections mais " +
        "gardera son historique. Tu pourras le réactiver à tout moment.",
      confirmLabel: "Désactiver",
      onConfirm: () => deactivate(player),
    });
  }

  function handleDelete(player: Player) {
    requestConfirm({
      message: `Supprimer « ${player.name} » ? Cette action est définitive.`,
      confirmLabel: "Supprimer",
      onConfirm: () => deletePlayer(player),
    });
  }

  async function deletePlayer(player: Player) {
    setActionError(null);
    try {
      await removePlayer(player.id);
    } catch (e) {
      if (e instanceof PlayerInUseError) {
        setActionError(
          `« ${player.name} » a déjà participé à une partie : impossible de ` +
            "le supprimer. Tu peux le désactiver à la place.",
        );
      } else {
        setActionError("Suppression impossible. Réessaie.");
      }
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
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

      {/* Only the list of players scrolls; the header above and the action bar
          below stay put. */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Chargement…</p>
        ) : players.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aucun joueur pour l&apos;instant.
          </p>
        ) : (
          <>
            <PlayerCardList
              title="Joueurs actifs"
              players={active}
              onToggle={p => handleToggle(p, false)}
              actionLabel="Désactiver"
              onDelete={handleDelete}
            />
            {inactive.length > 0 ? (
              <PlayerCardList
                title="Désactivés"
                players={inactive}
                onToggle={p => handleToggle(p, true)}
                actionLabel="Réactiver"
                onDelete={handleDelete}
                dimmed
                collapsible
              />
            ) : null}
          </>
        )}
      </div>

      {/* Add a player: fixed at the bottom, the form expands in place. */}
      <StickyActionBar>
        {formOpen ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10"
          >
            <h2 className="text-sm font-semibold">Nouveau joueur</h2>
            <input
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (nameError) {
                  setNameError(null);
                }
              }}
              placeholder="Nom du joueur"
              aria-label="Nom du joueur"
              aria-invalid={nameError ? true : undefined}
              maxLength={20}
              className={`rounded-lg border bg-white px-3 py-2 outline-none dark:bg-zinc-900 ${
                nameError
                  ? "border-red-500 focus:border-red-500"
                  : "border-black/15 focus:border-indigo-500 dark:border-white/15"
              }`}
            />
            {nameError ? (
              <p
                role="alert"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {nameError}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || name.trim() === ""}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-black/10 px-4 py-2 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
          >
            + Ajouter un joueur
          </button>
        )}
      </StickyActionBar>

      {confirmDialog}
    </div>
  );
}
