"use client";

import { useCallback, useRef, useState } from "react";

import type { Player } from "@/lib/domain";
import { useDropdownSpace } from "@/lib/hooks/use-dropdown-space";
import { useOutsideClose } from "@/lib/hooks/use-outside-close";

/** How tall the suggestion list gets when the screen has the room for it. */
const PREFERRED_HEIGHT = 256;

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
  const [showList, setShowList] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setShowList(false), []);

  const q = query.trim();
  const ql = q.toLowerCase();
  const active = players.filter(p => p.isActive);
  const matches = active
    .filter(p => p.name.toLowerCase().includes(ql))
    .sort((a, b) => a.name.localeCompare(b.name));
  const showCreate =
    q.length > 0 && !active.some(p => p.name.toLowerCase() === ql);
  // Losing focus must NOT close the list: dismissing the keyboard is done by
  // blurring the field, and the list is exactly what one wants to read then.
  useOutsideClose(anchorRef, showList, close);
  // Typing raises the keyboard, so the room below the field can shrink while
  // the list is already open.
  const space = useDropdownSpace(anchorRef, showList, PREFERRED_HEIGHT);

  /** Adds the typed name as an off-app entry, then clears the search. */
  function createEntry(label: string) {
    onCreate(label);
    setQuery("");
  }

  return (
    <div ref={anchorRef} className="relative">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setShowList(true)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            // Enter puts the keyboard away rather than picking anything: with
            // half the screen back, the whole list is there to tap.
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        placeholder="Rechercher ou créer un joueur…"
        maxLength={40}
        className="w-full rounded-lg border border-black/15 bg-white py-2 pl-3 pr-10 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
      />
      {/* Opening from the chevron never focuses the field, so the list can be
          browsed without the keyboard taking half the screen. */}
      <button
        type="button"
        aria-label="Ouvrir la liste des joueurs"
        onClick={() => setShowList(o => !o)}
        className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-zinc-400"
      >
        ▾
      </button>

      {showList ? (
        <div
          data-testid="wheel-suggestions"
          data-placement={space?.placement ?? "below"}
          style={space ? { maxHeight: space.maxHeight } : undefined}
          className={`absolute inset-x-0 z-20 flex max-h-64 flex-col overflow-y-auto rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-zinc-900 ${
            space?.placement === "above" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
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
