"use client";

import { useState } from "react";

import type { ConfirmRequest } from "@/components/ConfirmDialog";
import type { NewPlayer, Player } from "@/lib/domain";
import { DuplicateNameError } from "@/lib/repositories/errors";
import { NewPlayerForm } from "./NewPlayerForm";

const normalize = (s: string) => s.trim().toLowerCase();

/**
 * Adding a player, from the button that offers it to the row that appears: owns
 * the name being typed, the duplicate-name check, the confirmation, and closing
 * the form once the player exists.
 *
 * Returns `newPlayerForm` — the button, or the form once it is open — for the
 * screen to place where it wants; the same shape as `useSearch`/`useConfirm`.
 */
export function useNewPlayer({
  players,
  addPlayer,
  requestConfirm,
  onFailure,
}: Readonly<{
  /** Everyone already known, to refuse a name twice over. */
  players: Player[];
  addPlayer: (input: NewPlayer) => Promise<void>;
  requestConfirm: (request: ConfirmRequest) => void;
  /** Told about a failure the form itself cannot show, for the screen to say. */
  onFailure: (message: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  function close() {
    setName("");
    setNameError(null);
    setOpen(false);
  }

  async function createPlayer(trimmed: string) {
    setSubmitting(true);

    try {
      await addPlayer({ name: trimmed });
      close();
    } catch (e) {
      // Safety net if someone else took the name between the check and submit.
      if (e instanceof DuplicateNameError) {
        setNameError("Ce nom est déjà pris.");
      } else {
        onFailure("Ajout impossible. Réessaie.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function submit() {
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

  const newPlayerForm = open ? (
    <NewPlayerForm
      name={name}
      error={nameError}
      submitting={submitting}
      onName={value => {
        setName(value);
        setNameError(null);
      }}
      onSubmit={submit}
      onCancel={close}
    />
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
    >
      + Ajouter un joueur
    </button>
  );

  return { newPlayerForm };
}
