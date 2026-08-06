"use client";

import { useState } from "react";

import type { Player } from "@/lib/domain";

/**
 * The wheel's search bar: active players whose name contains the query,
 * alphabetical (so an empty, focused search lists them all), plus — unless a
 * player matches the query exactly — a "create" option first, to add the typed
 * name as an off-app entry.
 */
export function PlayerSearch({
  players,
  addedIds,
  onCreate,
  onToggle,
}: Readonly<{
  players: Player[];
  addedIds: ReadonlySet<string>;
  onCreate: (label: string) => void;
  onToggle: (id: string, name: string) => void;
}>) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const q = query.trim();
  const ql = q.toLowerCase();
  const active = players.filter(p => p.isActive);
  const matches = active
    .filter(p => p.name.toLowerCase().includes(ql))
    .sort((a, b) => a.name.localeCompare(b.name));
  const showCreate =
    q.length > 0 && !active.some(p => p.name.toLowerCase() === ql);
  // The list opens on focus (all players when empty) and while typing.
  const showList = focused || q.length > 0;

  /** Adds the typed name as an off-app entry, then clears the search. */
  function createEntry(label: string) {
    onCreate(label);
    setQuery("");
  }

  function pickFirst() {
    if (showCreate) {
      createEntry(q);

      return;
    }

    const addable = matches.find(p => !addedIds.has(p.id));

    if (addable) {
      onToggle(addable.id, addable.name);
    }
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            pickFirst();
          }
        }}
        placeholder="Rechercher ou créer un joueur…"
        maxLength={40}
        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
      />

      {showList ? (
        <div
          data-testid="wheel-suggestions"
          className="absolute inset-x-0 top-full z-20 mt-1 flex max-h-64 flex-col overflow-y-auto rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-zinc-900"
        >
          {showCreate ? (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => createEntry(q)}
              className="px-3 py-2 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              ➕ Créer « <span className="font-medium">{q}</span> »
            </button>
          ) : null}

          {showCreate && matches.length > 0 ? (
            <div className="border-black/10 border-t dark:border-white/10" />
          ) : null}

          {matches.map(p => (
            <PlayerRow
              key={p.id}
              name={p.name}
              selected={addedIds.has(p.id)}
              onClick={() => onToggle(p.id, p.name)}
            />
          ))}

          {!showCreate && matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              Aucun joueur.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** One suggestion: clicking it toggles that player on/off the wheel. */
function PlayerRow({
  name,
  selected,
  onClick,
}: Readonly<{ name: string; selected: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className="flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
    >
      <span className={selected ? "font-medium" : undefined}>{name}</span>
      {selected ? (
        <span aria-hidden className="text-indigo-500">
          ✓
        </span>
      ) : null}
    </button>
  );
}
