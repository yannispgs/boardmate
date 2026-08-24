"use client";

import { type ReactNode, useCallback, useRef, useState } from "react";

import { searchByName } from "@/lib/game/player-search";
import { useDropdownSpace } from "@/lib/hooks/use-dropdown-space";
import { useOutsideClose } from "@/lib/hooks/use-outside-close";

/** How tall the panel gets when the screen has the room for it. */
const PREFERRED_HEIGHT = 288;

/**
 * A searchable multi-select shown as a box of removable pills. Empty selection
 * renders a single "Tous" pill (so the box stays small when everything is in
 * scope). Clicking the box opens a dropdown with a text search; clicking an
 * option toggles it. Each selected pill carries a × to remove it in one tap,
 * and the box carries a bulk button taking every option in or out at once.
 *
 * Generic over the id so callers holding branded ids (`PlayerId`,
 * `BoardgameId`) get them back branded instead of casting on every change.
 */
export function MultiSelectField<Id extends string>({
  label,
  options,
  selected,
  onChange,
  excluding = false,
}: Readonly<{
  label: string;
  options: { id: Id; name: string }[];
  selected: Id[];
  onChange: (ids: Id[]) => void;
  /**
   * Turns the tick round: every option opens ticked and `selected` holds the
   * ones taken out, so the filter is read as « everything, minus these ». The
   * box says « Tous » until one is unticked, then names whichever side is
   * shorter — « Tous sauf … » or « Seulement … » — down to « Aucun » once
   * nothing is left ticked.
   */
  excluding?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useOutsideClose(ref, open, close);

  const toggle = (id: Id) =>
    onChange(
      selected.includes(id)
        ? selected.filter(x => x !== id)
        : [...selected, id],
    );
  const allIds = options.map(o => o.id);
  /** Every option ticked — which in `excluding` mode excludes nothing. */
  const tickAll = () => onChange(excluding ? [] : allIds);
  /** None ticked — which in `excluding` mode excludes the lot. */
  const untickAll = () => onChange(excluding ? allIds : []);

  /**
   * The options still ticked — only ever consulted in `excluding` mode, where
   * they are the ones the filter keeps rather than the ones it drops.
   */
  const kept = allIds.filter(id => !selected.includes(id));
  /**
   * 🔑 Which side of the filter the box spells out: the **shorter** of the two.
   * Listing « tous sauf » nine games to say « celui-ci » is a list nobody
   * reads, and the whole point of a filter box is to be read at a glance. The
   * word in front says which reading it is, so the flip is never silent.
   */
  const showingKept = excluding && kept.length < selected.length;
  const shown = showingKept ? kept : selected;

  const nameOf = (id: Id) => options.find(o => o.id === id)?.name ?? id;
  /** Takes one pill out of what the box currently spells — never the reverse. */
  const removeShown = (id: Id) =>
    onChange(showingKept ? [...selected, id] : selected.filter(x => x !== id));

  const filtered = searchByName(options, query);
  // The panel carries its own search field, so the keyboard covers the bottom
  // of the screen here too — same fitting as the wheel's list.
  const space = useDropdownSpace(ref, open, PREFERRED_HEIGHT);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div ref={ref} className="relative">
        {/* The box: pills (each with their own × button), then a flex-1 trigger
            filling the empty space so a tap anywhere blank opens it, and last
            the bulk button and the chevron, pinned right. */}
        <div className="flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-xl border border-black/10 p-2 dark:border-white/15">
          {shown.length === 0 ? (
            <span className="rounded-full border border-indigo-500 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-700 dark:text-indigo-300">
              {showingKept ? "Aucun" : "Tous"}
            </span>
          ) : (
            <>
              {/* Without it, a pill would read as something kept rather than
                  as something dropped — the exact opposite of the filter. */}
              {excluding ? (
                <span className="pl-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {showingKept ? "Seulement" : "Tous sauf"}
                </span>
              ) : null}

              {shown.map(id => (
                <span
                  key={id}
                  className="flex items-center gap-1 rounded-full border border-indigo-500 bg-indigo-500/10 py-1 pl-3 pr-1 text-sm text-indigo-700 dark:text-indigo-300"
                >
                  {nameOf(id)}
                  <button
                    type="button"
                    aria-label={
                      excluding && !showingKept
                        ? `Remettre ${nameOf(id)}`
                        : `Retirer ${nameOf(id)}`
                    }
                    onClick={() => removeShown(id)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-indigo-700/70 transition hover:bg-indigo-500/20 hover:text-indigo-700 dark:text-indigo-300/70 dark:hover:text-indigo-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </>
          )}
          {/* Unnamed on purpose: it is the same command as the chevron, and a
              second button answering to « Ouvrir la liste » would make every
              locator ambiguous. */}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen(o => !o)}
            className="min-w-4 flex-1 cursor-pointer self-stretch"
          />
          {/* Kept together and pushed right by `ml-auto`: enough pills to fill
              the line send the pair onto the next one, where without it they
              would sit alone on the left, under the first pill. */}
          <div className="ml-auto flex items-center gap-1 self-stretch">
            {/* 🔑 Emptying the field is one tap, not one per option: with ten
                games, reaching « seulement celui-ci » by hand meant unticking
                nine. Past halfway the button turns round and puts them all
                back, which is the same halfway mark the box flips its wording
                at — so the whole field changes state at one single point. */}
            {excluding || selected.length > 0 ? (
              <button
                type="button"
                aria-label={bulkLabel(excluding, showingKept, label)}
                onClick={showingKept ? tickAll : untickAll}
                className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition hover:bg-black/5 hover:text-zinc-600 dark:hover:bg-white/5 dark:hover:text-zinc-200"
              >
                {showingKept ? "+" : "✕"}
              </button>
            ) : null}
            <button
              type="button"
              aria-label={`Ouvrir la liste : ${label}`}
              onClick={() => setOpen(o => !o)}
              className="flex cursor-pointer items-center self-stretch pr-1 text-zinc-400"
            >
              ▾
            </button>
          </div>
        </div>

        {open ? (
          <div
            data-placement={space?.placement ?? "below"}
            style={space ? { maxHeight: space.maxHeight } : undefined}
            className={`absolute z-20 flex w-full flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/15 dark:bg-zinc-900 ${
              space?.placement === "above"
                ? "bottom-full mb-1"
                : "top-full mt-1"
            }`}
          >
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  // Same bargain as the wheel's search: Enter hands the screen
                  // back by dismissing the keyboard, and the list stays put.
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              placeholder="Rechercher…"
              className="w-full shrink-0 border-b border-black/10 bg-transparent p-2 text-sm outline-none dark:border-white/10"
            />
            {/* `min-h-0` is what lets it shrink inside the capped panel — a flex
                child otherwise refuses to go below its content's height. */}
            <ul className="max-h-56 min-h-0 flex-1 overflow-y-auto p-1">
              {/* Named after the state they land on, and spelled out in words:
                  the box's own button says the same thing in one glyph, which
                  is not enough to act on when the two are opposites. */}
              {excluding ? (
                <>
                  {selected.length > 0 ? (
                    <BulkAction onClick={tickAll}>Tout cocher</BulkAction>
                  ) : null}
                  {kept.length > 0 ? (
                    <BulkAction onClick={untickAll}>Tout décocher</BulkAction>
                  ) : null}
                </>
              ) : selected.length > 0 ? (
                <BulkAction onClick={tickAll}>Tous (réinitialiser)</BulkAction>
              ) : null}

              {filtered.map(o => {
                const on = excluding
                  ? !selected.includes(o.id)
                  : selected.includes(o.id);

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

/**
 * What the box's bulk button does, spelled out — the glyph alone is a « ✕ » and
 * a « + » one tap apart, so the name has to carry the meaning.
 *
 * A plain filter has no use for « tout cocher »: naming every option is the
 * same scope as naming none, and on the presence filter it would ask for the
 * games where *everybody* played, which is usually none. It only ever clears.
 */
function bulkLabel(excluding: boolean, showingKept: boolean, label: string) {
  if (!excluding) {
    return `Tout effacer : ${label}`;
  }

  return showingKept ? `Tout cocher : ${label}` : `Tout décocher : ${label}`;
}

/** One « take them all in / out » row at the top of the panel. */
function BulkAction({
  onClick,
  children,
}: Readonly<{ onClick: () => void; children: ReactNode }>) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 transition hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
      >
        {children}
      </button>
    </li>
  );
}
