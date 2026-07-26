"use client";

import { useEffect, useRef, useState } from "react";

import { searchByName } from "@/lib/game/player-search";

/**
 * A searchable multi-select shown as a box of removable pills. Empty selection
 * renders a single "Tous" pill (so the box stays small when everything is in
 * scope). Clicking the box opens a dropdown with a text search; clicking an
 * option toggles it. Each selected pill carries a × to remove it in one tap.
 *
 * Generic over the id so callers holding branded ids (`PlayerId`,
 * `BoardgameId`) get them back branded instead of casting on every change.
 */
export function MultiSelectField<Id extends string>({
  label,
  options,
  selected,
  onChange,
}: Readonly<{
  label: string;
  options: { id: Id; name: string }[];
  selected: Id[];
  onChange: (ids: Id[]) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onDown);

    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const nameOf = (id: Id) => options.find(o => o.id === id)?.name ?? id;
  const toggle = (id: Id) =>
    onChange(
      selected.includes(id)
        ? selected.filter(x => x !== id)
        : [...selected, id],
    );
  const remove = (id: Id) => onChange(selected.filter(x => x !== id));

  const filtered = searchByName(options, query);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div ref={ref} className="relative">
        {/* The box: pills (each with their own × button) plus a flex-1 trigger
            button filling the empty space, so a tap anywhere blank opens it. */}
        <div className="flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-xl border border-black/10 p-2 dark:border-white/15">
          {selected.length === 0 ? (
            <span className="rounded-full border border-indigo-500 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-700 dark:text-indigo-300">
              Tous
            </span>
          ) : (
            selected.map(id => (
              <span
                key={id}
                className="flex items-center gap-1 rounded-full border border-indigo-500 bg-indigo-500/10 py-1 pl-3 pr-1 text-sm text-indigo-700 dark:text-indigo-300"
              >
                {nameOf(id)}
                <button
                  type="button"
                  aria-label={`Retirer ${nameOf(id)}`}
                  onClick={() => remove(id)}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-indigo-700/70 transition hover:bg-indigo-500/20 hover:text-indigo-700 dark:text-indigo-300/70 dark:hover:text-indigo-300"
                >
                  ×
                </button>
              </span>
            ))
          )}
          <button
            type="button"
            aria-label="Ouvrir la liste"
            onClick={() => setOpen(o => !o)}
            className="ml-auto flex min-w-8 flex-1 cursor-pointer justify-end self-stretch pr-1 text-zinc-400"
          >
            ▾
          </button>
        </div>

        {open ? (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/15 dark:bg-zinc-900">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full border-b border-black/10 bg-transparent p-2 text-sm outline-none dark:border-white/10"
            />
            <ul className="max-h-56 overflow-y-auto p-1">
              {selected.length > 0 ? (
                <li>
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 transition hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
                  >
                    Tous (réinitialiser)
                  </button>
                </li>
              ) : null}
              {filtered.map(o => {
                const on = selected.includes(o.id);

                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => toggle(o.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/5 ${
                        on
                          ? "font-medium text-indigo-700 dark:text-indigo-300"
                          : ""
                      }`}
                    >
                      {o.name}
                      {on ? <span aria-hidden>✓</span> : null}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-400">
                  Aucun résultat
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
