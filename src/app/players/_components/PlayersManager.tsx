"use client";

import { type FormEvent, useState } from "react";

import type { Player } from "@/lib/domain";
import { usePlayers } from "@/lib/hooks/use-players";
import {
  DuplicateNameError,
  PlayerInUseError,
} from "@/lib/repositories/errors";

const normalize = (s: string) => s.trim().toLowerCase();

export function PlayersManager() {
  const { players, loading, error, addPlayer, setActive, removePlayer } =
    usePlayers();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const active = players.filter((p) => p.isActive);
  const inactive = players.filter((p) => !p.isActive);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    // Reject a duplicate name up front (case/space-insensitive).
    if (players.some((p) => normalize(p.name) === normalize(trimmed))) {
      setNameError("Ce nom est déjà pris.");
      return;
    }

    // Players can only be deleted before they've played — make sure the user
    // knows before committing to the name.
    const confirmed = window.confirm(
      `Créer le joueur « ${trimmed} » ?\n\n` +
        "Un joueur ne pourra plus être supprimé dès qu'il aura participé à " +
        "une partie (il pourra seulement être désactivé).",
    );
    if (!confirmed) return;

    setSubmitting(true);
    setNameError(null);
    setActionError(null);
    try {
      await addPlayer({ name: trimmed });
      setName("");
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

  async function handleDelete(player: Player) {
    if (
      !window.confirm(
        `Supprimer « ${player.name} » ? Cette action est définitive.`,
      )
    ) {
      return;
    }
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
      <form onSubmit={handleAdd} className="flex flex-col gap-1">
        <div className="flex gap-2">
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
            className={`flex-1 rounded-lg border bg-white px-3 py-2 outline-none dark:bg-zinc-900 ${
              nameError
                ? "border-red-500 focus:border-red-500"
                : "border-black/15 focus:border-indigo-500 dark:border-white/15"
            }`}
          />
          <button
            type="submit"
            disabled={submitting || name.trim() === ""}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            Ajouter
          </button>
        </div>
        {nameError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {nameError}
          </p>
        ) : null}
      </form>

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

      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : players.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucun joueur pour l&apos;instant. Ajoute le premier ci-dessus.
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
