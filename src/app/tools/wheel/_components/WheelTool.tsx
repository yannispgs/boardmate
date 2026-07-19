"use client";

import { useState } from "react";

import {
  useWheelSpin,
  type WheelSegment,
  WheelSvg,
} from "@/components/WheelSvg";
import { usePlayers } from "@/lib/hooks/use-players";

/**
 * A standalone wheel of fortune: build a list of entries — the active players in
 * one tap, plus any free-text names for people or things not in the app — then
 * spin to pick one at random. Nothing is saved; it never touches games or stats.
 */
export function WheelTool() {
  const { players } = usePlayers();
  const [entries, setEntries] = useState<WheelSegment[]>([]);
  const [query, setQuery] = useState("");
  const { rotation, spinning, settledIndex, spin, handleSettled, reset } =
    useWheelSpin(entries.length);

  const winner =
    settledIndex !== null && settledIndex < entries.length
      ? entries[settledIndex]
      : null;

  function edit(next: WheelSegment[]) {
    reset();
    setEntries(next);
  }

  function addEntry(id: string, label: string) {
    edit([...entries, { id, label }]);
    setQuery("");
  }

  function addActivePlayers() {
    const present = new Set(entries.map(e => e.id));
    const toAdd = players
      .filter(p => p.isActive && !present.has(p.id))
      .map(p => ({ id: p.id, label: p.name }));

    if (toAdd.length > 0) {
      edit([...entries, ...toAdd]);
    }
  }

  function removeEntry(id: string) {
    edit(entries.filter(e => e.id !== id));
  }

  const canSpin = entries.length >= 2 && !spinning;

  // The search bar: existing (active, not-yet-added) players whose name contains
  // the query, and — unless a player matches it exactly — a "create" option
  // first, to add the typed name as an off-app entry.
  const q = query.trim();
  const ql = q.toLowerCase();
  const addedIds = new Set(entries.map(e => e.id));
  const active = players.filter(p => p.isActive);
  const matches = active.filter(
    p => !addedIds.has(p.id) && p.name.toLowerCase().includes(ql),
  );
  const showCreate =
    q.length > 0 && !active.some(p => p.name.toLowerCase() === ql);

  function pickFirst() {
    if (showCreate) {
      addEntry(crypto.randomUUID(), q);
    } else if (matches.length > 0) {
      addEntry(matches[0].id, matches[0].name);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              pickFirst();
            }
          }}
          placeholder="Rechercher ou créer un joueur…"
          maxLength={40}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
        />

        {q.length > 0 ? (
          <div className="flex flex-col overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
            {showCreate ? (
              <button
                type="button"
                onClick={() => addEntry(crypto.randomUUID(), q)}
                className="px-3 py-2 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                ➕ Créer « <span className="font-medium">{q}</span> »
              </button>
            ) : null}
            {showCreate && matches.length > 0 ? (
              <div className="border-black/10 border-t dark:border-white/10" />
            ) : null}
            {matches.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => addEntry(p.id, p.name)}
                className="px-3 py-2 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                {p.name}
              </button>
            ))}
            {!showCreate && matches.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                Aucun joueur.
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={addActivePlayers}
          className="self-start rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          + Ajouter les joueurs actifs
        </button>

        {entries.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {entries.map(e => (
              <li
                key={e.id}
                className="flex items-center gap-1.5 rounded-full bg-black/5 py-1 pr-1 pl-3 text-sm dark:bg-white/10"
              >
                {e.label}
                <button
                  type="button"
                  onClick={() => removeEntry(e.id)}
                  aria-label={`Retirer ${e.label}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition hover:bg-black/10 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ajoute au moins deux entrées pour lancer la roue.
          </p>
        )}
      </div>

      {entries.length >= 2 ? (
        <WheelSvg
          segments={entries}
          rotation={rotation}
          spinning={spinning}
          onSettled={handleSettled}
        />
      ) : null}

      {winner ? (
        <p className="text-center text-lg" aria-live="polite">
          🎉 <span className="font-semibold">{winner.label}</span> !
        </p>
      ) : (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {spinning ? "La roue tourne…" : "Lance la roue pour tirer au sort."}
        </p>
      )}

      <button
        type="button"
        onClick={spin}
        disabled={!canSpin}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {winner ? "Relancer" : "Tourner la roue"}
      </button>
    </div>
  );
}
