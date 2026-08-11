"use client";

import { useState } from "react";

import { Drawer } from "@/components/Drawer";
import { ErrorText } from "@/components/ErrorText";
import { FaqEntryForm } from "@/components/FaqEntryForm";
import { HelpIcon } from "@/components/icons";
import { ModalHeader } from "@/components/ModalHeader";
import { OptionPicker } from "@/components/OptionPicker";
import type {
  Boardgame,
  ExtensionId,
  FaqScope,
  NewFaqEntry,
} from "@/lib/domain";
import {
  faqEmptyMessage,
  gameFaqSections,
  nextSortOrder,
  scopeKey,
  scopeLabel,
  searchFaq,
} from "@/lib/game/faq";
import { useFaq } from "@/lib/hooks/use-faq";
import { FaqSectionList } from "./FaqSectionList";

/** The extensions this game is played with. */
type PlayedExtensions = Array<{ id: ExtensionId; name: string }>;

/** A question being written at the table, and the section it will land in. */
interface Draft {
  scope: FaqScope;
  question: string;
  answer: string;
}

/**
 * The rules you keep re-asking, one tap away from the table: a corner button
 * opening the FAQ of the game being played, followed by the FAQ of each
 * extension on the table — and only those, since an extension's rules do not
 * exist when it is not being played with.
 *
 * A search field sits at the top because that is how a question arrives
 * mid-game: with a word in mind ("port", "chevalier"), not a place in a list.
 *
 * A « + » beside « Fermer » writes a new one down. Mid-game is when a rule
 * question is actually settled, and a question left unwritten until after the
 * game is a question asked again next time — so the panel takes new entries,
 * and only new ones: rewording and reordering stay on the FAQ screen, where
 * there is room to read what is already there.
 */
export function FaqPanel({
  boardgame,
  extensions,
}: Readonly<{
  boardgame: Boardgame;
  /** The extensions this game is played with (empty when none). */
  extensions: PlayedExtensions;
}>) {
  const { entries, loading, error, add } = useFaq();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
  // Where a question written here can be filed: the game, or one of the
  // extensions on the table.
  const sections = draftSections(boardgame, extensions);

  function close() {
    setOpen(false);
    // What was typed goes with the panel: the next question is a new one.
    setQuery("");
    setDraft(null);
  }

  function startAdding() {
    setFormError(null);
    setDraft({ scope: sections[0].scope, question: "", answer: "" });
  }

  async function save(entry: Draft) {
    const question = entry.question.trim();
    const answer = entry.answer.trim();

    setSaving(true);

    try {
      await add(newEntry(entry, question, answer, entries));
      setDraft(null);
      // The list is what confirms the question landed, so it has to be able to
      // show it — a search still narrowing to something else would hide it.
      setQuery("");
    } catch {
      setFormError("Enregistrement impossible. Réessaie.");
    } finally {
      setSaving(false);
    }
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
        <ModalHeader
          title="FAQ"
          hint={boardgame.name}
          action={
            draft === null ? (
              <button
                type="button"
                onClick={startAdding}
                aria-label="Ajouter une question"
                className="shrink-0 rounded-lg border border-black/10 px-3 py-1 text-base font-semibold leading-5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                +
              </button>
            ) : undefined
          }
          onClose={close}
        />

        <div className="flex flex-col gap-4 p-4">
          {draft === null ? (
            <>
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
            </>
          ) : (
            <>
              {/* Only worth asking when there is something to choose between:
                  with no extension on the table there is one section. */}
              {sections.length > 1 ? (
                <OptionPicker
                  variant="chips"
                  label="Section"
                  options={sections.map(s => ({
                    value: scopeKey(s.scope),
                    label: s.label,
                  }))}
                  value={scopeKey(draft.scope)}
                  onChange={key => setDraft(fileUnder(draft, sections, key))}
                />
              ) : null}

              <FaqEntryForm
                scopeLabel={label(draft.scope)}
                question={draft.question}
                answer={draft.answer}
                editing={false}
                error={formError}
                submitting={saving}
                onQuestion={question => setDraft({ ...draft, question })}
                onAnswer={answer => setDraft({ ...draft, answer })}
                onSubmit={() => save(draft)}
                onCancel={() => setDraft(null)}
              />
            </>
          )}
        </div>
      </Drawer>
    </>
  );
}

/**
 * The sections a question written at the table can be filed under: the game
 * being played, then each extension on it. Deliberately not the whole FAQ — the
 * app's own section, and the games nobody is playing, are not what a question
 * asked over the board is about.
 */
function draftSections(
  boardgame: Boardgame,
  extensions: PlayedExtensions,
): Array<{ scope: FaqScope; label: string }> {
  return [
    {
      scope: { kind: "boardgame", boardgameId: boardgame.id },
      label: boardgame.name,
    },
    ...extensions.map(e => ({
      scope: { kind: "extension" as const, extensionId: e.id },
      label: e.name,
    })),
  ];
}

/** The draft moved to the section the picker named. */
function fileUnder(
  draft: Draft,
  sections: Array<{ scope: FaqScope; label: string }>,
  key: string,
): Draft {
  const picked = sections.find(s => scopeKey(s.scope) === key);

  return picked === undefined ? draft : { ...draft, scope: picked.scope };
}

/** The draft as the repository takes it, filed at the end of its section. */
function newEntry(
  draft: Draft,
  question: string,
  answer: string,
  entries: Parameters<typeof nextSortOrder>[0],
): NewFaqEntry {
  return {
    scope: draft.scope,
    question,
    answer,
    sortOrder: nextSortOrder(entries, draft.scope),
  };
}
