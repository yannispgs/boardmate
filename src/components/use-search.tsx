"use client";

import { useRef, useState } from "react";

import { CloseIcon, SearchIcon } from "@/components/icons";
import { iconButtonClass } from "@/components/ui";

/**
 * Drives a search field that stays out of the way until it is wanted: render
 * `searchToggle` in the screen heading's action slot and `searchField` right
 * under the heading, then narrow the list with `query`.
 *
 * Two pieces rather than one component because they belong in two different
 * places of the heading — the same split `useConfirm` makes.
 *
 * Closing clears what was typed: a field that is not on screen must not go on
 * hiding half the list.
 */
export function useSearch({
  label,
  placeholder,
}: {
  /** What the magnifying glass is for, e.g. "Rechercher un joueur". */
  label: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  function toggle() {
    if (open) {
      setQuery("");
    }

    setOpen(!open);
    // Opening it should put the caret in it — the tap on the glass was already
    // the decision to type.
    requestAnimationFrame(() => input.current?.focus());
  }

  const searchToggle = (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? "Fermer la recherche" : label}
      title={label}
      className={`${iconButtonClass} ${
        open ? "bg-black/5 dark:bg-white/10" : ""
      }`}
    >
      {open ? <CloseIcon /> : <SearchIcon />}
    </button>
  );

  const searchField = open ? (
    <input
      ref={input}
      value={query}
      onChange={e => setQuery(e.target.value)}
      type="search"
      placeholder={placeholder}
      aria-label={label}
      className="mt-2 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
    />
  ) : null;

  return { query, searchToggle, searchField };
}
