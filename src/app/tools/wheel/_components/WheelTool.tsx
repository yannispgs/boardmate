"use client";

import { useState } from "react";

import {
  useWheelSpin,
  type WheelSegment,
  WheelSvg,
} from "@/components/WheelSvg";
import { usePlayers } from "@/lib/hooks/use-players";

/**
 * A standalone wheel of fortune: search the active players to toggle them on the
 * wheel, or create off-app entries from any typed name, then spin to pick one at
 * random. Nothing is saved; it never touches games or stats.
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

  function removeEntry(id: string) {
    edit(entries.filter(e => e.id !== id));
  }

  /** Adds the typed name as an off-app entry, then clears the search. */
  function createEntry(label: string) {
    edit([...entries, { id: crypto.randomUUID(), label }]);
    setQuery("");
  }

  /** Clicking a player toggles it on/off the wheel (keeps the search open). */
  function togglePlayer(id: string, name: string) {
    if (entries.some(e => e.id === id)) {
      removeEntry(id);
    } else {
      edit([...entries, { id, label: name }]);
    }
  }

  const canSpin = entries.length >= 2 && !spinning;

  // The search bar: existing (active, not-yet-added) players whose name contains
  // the query, and — unless a player matches it exactly — a "create" option
  // first, to add the typed name as an off-app entry.
  const q = query.trim();
  const ql = q.toLowerCase();
  const addedIds = new Set(entries.map(e => e.id));
  const active = players.filter(p => p.isActive);
  const matches = active.filter(p => p.name.toLowerCase().includes(ql));
  const showCreate =
    q.length > 0 && !active.some(p => p.name.toLowerCase() === ql);

  function pickFirst() {
    if (showCreate) {
      createEntry(q);

      return;
    }

    const addable = matches.find(p => !addedIds.has(p.id));

    if (addable) {
      togglePlayer(addable.id, addable.name);
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
          <div
            data-testid="wheel-suggestions"
            className="flex flex-col overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
          >
            {showCreate ? (
              <button
                type="button"
                onClick={() => createEntry(q)}
                className="px-3 py-2 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                ➕ Créer « <span className="font-medium">{q}</span> »
              </button>
            ) : null}
            {showCreate && matches.length > 0 ? (
              <div className="border-black/10 border-t dark:border-white/10" />
            ) : null}
            {matches.map(p => {
              const selected = addedIds.has(p.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlayer(p.id, p.name)}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className={selected ? "font-medium" : undefined}>
                    {p.name}
                  </span>
                  {selected ? (
                    <span aria-hidden className="text-indigo-500">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
            {!showCreate && matches.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                Aucun joueur.
              </p>
            ) : null}
          </div>
        ) : null}

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
