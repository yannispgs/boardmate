"use client";

import { type FormEvent, useState } from "react";

import type { Player } from "@/lib/domain";
import { usePlayers } from "@/lib/hooks/use-players";

export function PlayersManager() {
  const { players, loading, error, addPlayer, setActive } = usePlayers();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const active = players.filter((p) => p.isActive);
  const inactive = players.filter((p) => !p.isActive);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await addPlayer({ name: trimmed });
      setName("");
    } catch {
      setFormError("Ajout impossible. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du joueur"
          aria-label="Nom du joueur"
          maxLength={40}
          className="flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={submitting || name.trim() === ""}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Ajouter
        </button>
      </form>
      {formError ? (
        <p
          role="alert"
          className="-mt-4 text-sm text-red-600 dark:text-red-400"
        >
          {formError}
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
          />
          {inactive.length > 0 ? (
            <PlayerList
              title="Désactivés"
              players={inactive}
              onToggle={(p) => setActive(p.id, true)}
              actionLabel="Réactiver"
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
  dimmed = false,
}: {
  title: string;
  players: Player[];
  onToggle: (player: Player) => void;
  actionLabel: string;
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
            className={`flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900 ${
              dimmed ? "opacity-60" : ""
            }`}
          >
            <span className="font-medium">{player.name}</span>
            <button
              type="button"
              onClick={() => onToggle(player)}
              className="rounded-md border border-black/10 px-2 py-1 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              {actionLabel}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
