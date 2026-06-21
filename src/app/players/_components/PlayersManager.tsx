"use client";

import { type FormEvent, useState } from "react";

import type { Player } from "@/lib/domain";
import { usePlayers } from "@/lib/hooks/use-players";
import {
  DuplicateNameError,
  PlayerInUseError,
} from "@/lib/repositories/errors";

const normalize = (s: string) => s.trim().toLowerCase();

interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

export function PlayersManager() {
  const { players, loading, error, addPlayer, setActive, removePlayer } =
    usePlayers();
  const [name, setName] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // In-app confirmation (replaces window.confirm, which browsers suppress).
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const active = players.filter((p) => p.isActive);
  const inactive = players.filter((p) => !p.isActive);

  function closeForm() {
    setName("");
    setNameError(null);
    setFormOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    // Reject a duplicate name up front (case/space-insensitive).
    if (players.some((p) => normalize(p.name) === normalize(trimmed))) {
      setNameError("Ce nom est déjà pris.");
      return;
    }
    setNameError(null);

    // Players can only be deleted before they've played — confirm first.
    setConfirm({
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

  function handleDelete(player: Player) {
    setConfirm({
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

      {/* Existing players first */}
      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : players.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucun joueur pour l&apos;instant.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <PlayerList
            title="Joueurs actifs"
            players={active}
            onToggle={(p) => setActive(p.id, false)}
            actionLabel="Désactiver"
            onDelete={handleDelete}
          />
          {inactive.length > 0 ? (
            <PlayerList
              title="Désactivés"
              players={inactive}
              onToggle={(p) => setActive(p.id, true)}
              actionLabel="Réactiver"
              onDelete={handleDelete}
              dimmed
            />
          ) : null}
        </div>
      )}

      {/* Add a player: the form lives below the list, behind a button */}
      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10"
        >
          <h2 className="text-sm font-semibold">Nouveau joueur</h2>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Nom du joueur"
            aria-label="Nom du joueur"
            aria-invalid={nameError ? true : undefined}
            maxLength={40}
            className={`rounded-lg border bg-white px-3 py-2 outline-none dark:bg-zinc-900 ${
              nameError
                ? "border-red-500 focus:border-red-500"
                : "border-black/15 focus:border-indigo-500 dark:border-white/15"
            }`}
          />
          {nameError ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
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

      {confirm ? (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const run = confirm.onConfirm;
            setConfirm(null);
            void run();
          }}
        />
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <p className="whitespace-pre-line text-sm">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerList({
  title,
  players,
  onToggle,
  actionLabel,
  onDelete,
  dimmed = false,
}: {
  title: string;
  players: Player[];
  onToggle: (player: Player) => void;
  actionLabel: string;
  onDelete: (player: Player) => void;
  dimmed?: boolean;
}) {
  if (players.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {title} · {players.length}
      </h2>
      <ul className="flex flex-col gap-2">
        {players.map((player) => (
          <li
            key={player.id}
            className={`flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900 ${
              dimmed ? "opacity-60" : ""
            }`}
          >
            <span className="min-w-0 flex-1 truncate font-medium">
              {player.name}
            </span>
            <button
              type="button"
              onClick={() => onToggle(player)}
              className="rounded-md border border-black/10 px-2 py-1 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              {actionLabel}
            </button>
            <button
              type="button"
              onClick={() => onDelete(player)}
              className="rounded-md border border-black/10 px-2 py-1 text-sm text-red-600 transition hover:bg-red-50 dark:border-white/15 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
