"use client";

import { useState } from "react";

import { Drawer } from "@/components/Drawer";
import { ErrorText } from "@/components/ErrorText";
import { HelpIcon } from "@/components/icons";
import { ModalHeader } from "@/components/ModalHeader";
import type { Boardgame, ExtensionId, FaqScope } from "@/lib/domain";
import {
  faqEmptyMessage,
  gameFaqSections,
  scopeLabel,
  searchFaq,
} from "@/lib/game/faq";
import { useFaq } from "@/lib/hooks/use-faq";
import { FaqSectionList } from "./FaqSectionList";

/**
 * The rules you keep re-asking, one tap away from the table: a corner button
 * opening the FAQ of the game being played, followed by the FAQ of each
 * extension on the table — and only those, since an extension's rules do not
 * exist when it is not being played with.
 *
 * A search field sits at the top because that is how a question arrives
 * mid-game: with a word in mind ("port", "chevalier"), not a place in a list.
 * Read-only — a game in progress is no moment to be rewriting the rules; the
 * FAQ screen is where they are written.
 */
export function FaqPanel({
  boardgame,
  extensions,
}: Readonly<{
  boardgame: Boardgame;
  /** The extensions this game is played with (empty when none). */
  extensions: Array<{ id: ExtensionId; name: string }>;
}>) {
  const { entries, loading, error } = useFaq();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const extensionIds = extensions.map(e => e.id);
  const written = gameFaqSections(entries, boardgame.id, extensionIds);
  const shown = gameFaqSections(
    searchFaq(entries, query),
    boardgame.id,
    extensionIds,
  );
  const count = (sections: typeof written) =>
    sections.reduce((total, section) => total + section.entries.length, 0);
  const label = (scope: FaqScope) => scopeLabel(scope, [boardgame], extensions);
  const empty = faqEmptyMessage(
    count(written),
    count(shown),
    query,
    boardgame.name,
  );

  // The one grey line the panel says instead of a list, `null` when there is a
  // list worth showing (same shape as `ListBody`'s `said`).
  const said = loading ? "Chargement…" : empty;

  function close() {
    setOpen(false);
    // What was typed goes with the panel: the next question is a new one.
    setQuery("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la FAQ"
        className="fixed right-3 top-3 z-30 flex items-center justify-center rounded-full bg-indigo-600 p-3 text-white shadow-lg transition hover:bg-indigo-500"
      >
        <HelpIcon className="h-6 w-6" />
      </button>

      <Drawer open={open} onClose={close} label="FAQ">
        <ModalHeader title="FAQ" hint={boardgame.name} onClose={close} />

        <div className="flex flex-col gap-4 p-4">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Un mot de la question ou de la réponse"
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
          />

          <ErrorText message={error} />

          {said === null ? (
            <FaqSectionList sections={shown} label={label} />
          ) : (
            <p className="text-sm text-zinc-500">{said}</p>
          )}
        </div>
      </Drawer>
    </>
  );
}
