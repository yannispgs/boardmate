"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { ListBody } from "@/components/ListBody";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import { useSearch } from "@/components/use-search";
import type { FaqEntry, FaqEntryId, FaqScope } from "@/lib/domain";
import {
  entriesInScope,
  faqEmptyMessage,
  groupByScope,
  moveEntry,
  nextSortOrder,
  scopeKey,
  scopeLabel,
  searchFaq,
} from "@/lib/game/faq";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useAllExtensions } from "@/lib/hooks/use-extensions";
import { useFaq } from "@/lib/hooks/use-faq";
import { FaqEntryCardList } from "./FaqEntryCardList";
import { FaqEntryForm } from "./FaqEntryForm";
import { FaqScopePicker } from "./FaqScopePicker";

/** A question being written, new (`id: null`) or reworded. */
interface Draft {
  id: FaqEntryId | null;
  question: string;
  answer: string;
}

export function FaqManager({
  initialScope = { kind: "app" },
}: Readonly<{
  /** The section to open on — a game reached from its own FAQ shortcut. */
  initialScope?: FaqScope;
}>) {
  const { entries, loading, error, add, edit, remove, reorder } = useFaq();
  const { boardgames } = useBoardgames();
  const extensions = useAllExtensions();
  const [scope, setScope] = useState<FaqScope>(initialScope);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Two error slots, because they are read in two places: what the form did
  // wrong belongs under the form, what a tap on the list did wrong above it.
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { requestConfirm, confirmDialog } = useConfirm();
  const { query, searchToggle, searchField } = useSearch({
    label: "Rechercher une question",
    placeholder: "Un mot de la question ou de la réponse",
  });

  // A rule you are hunting for is worth finding whether or not you remember
  // which game it belongs to: searching leaves the open section and looks
  // everywhere, then shows the answers under the game they come from.
  const searching = query.trim() !== "";
  const found = searchFaq(entries, query);
  const shown = searching
    ? groupByScope(found)
    : [{ scope, entries: entriesInScope(entries, scope) }];
  const label = (of: FaqScope) => scopeLabel(of, boardgames, extensions);
  const visible = shown.reduce(
    (total, group) => total + group.entries.length,
    0,
  );

  function startAdding() {
    setFormError(null);
    setDraft({ id: null, question: "", answer: "" });
  }

  function startEditing(entry: FaqEntry) {
    setFormError(null);
    // Editing an entry found by search opens its own section, so what is being
    // reworded stays in sight once the form closes.
    setScope(entry.scope);
    setDraft({ id: entry.id, question: entry.question, answer: entry.answer });
  }

  async function save() {
    const question = draft?.question.trim() ?? "";
    const answer = draft?.answer.trim() ?? "";

    if (draft === null || question === "" || answer === "") {
      return;
    }

    setSubmitting(true);

    try {
      if (draft.id === null) {
        await add({
          scope,
          question,
          answer,
          sortOrder: nextSortOrder(entries, scope),
        });
      } else {
        await edit(draft.id, { question, answer });
      }

      setDraft(null);
    } catch {
      setFormError("Enregistrement impossible. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(entry: FaqEntry) {
    setActionError(null);

    try {
      await remove(entry.id);
    } catch {
      setActionError("Suppression impossible. Réessaie.");
    }
  }

  function confirmDelete(entry: FaqEntry) {
    requestConfirm({
      message: `Supprimer « ${entry.question} » ? Cette action est définitive.`,
      confirmLabel: "Supprimer",
      onConfirm: () => deleteEntry(entry),
    });
  }

  async function move(entry: FaqEntry, direction: "up" | "down") {
    setActionError(null);

    try {
      await reorder(moveEntry(entries, entry.id, direction));
    } catch {
      setActionError("Réorganisation impossible. Réessaie.");
    }
  }

  return (
    <>
      <ScreenHeader
        title="FAQ"
        description="Les questions qu'on se repose à chaque partie, et leurs réponses."
        action={searchToggle}
      >
        {searchField}
      </ScreenHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <ErrorText message={actionError} />

        <ErrorText message={error} />

        {searching ? null : (
          <FaqScopePicker
            boardgames={boardgames.filter(game => game.isActive)}
            extensions={extensions}
            scope={scope}
            onChange={setScope}
          />
        )}

        <ListBody
          loading={loading}
          message={faqEmptyMessage(
            entries.length,
            visible,
            query,
            label(scope),
          )}
        >
          {shown.map(group => (
            <FaqEntryCardList
              key={scopeKey(group.scope)}
              title={label(group.scope)}
              entries={group.entries}
              onEdit={startEditing}
              onDelete={confirmDelete}
              onMove={searching ? undefined : move}
            />
          ))}
        </ListBody>

        <StickyActionBar>
          {draft === null ? (
            <button
              type="button"
              onClick={startAdding}
              className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
            >
              + Ajouter une question
            </button>
          ) : (
            <FaqEntryForm
              scopeLabel={label(scope)}
              question={draft.question}
              answer={draft.answer}
              editing={draft.id !== null}
              error={formError}
              submitting={submitting}
              onQuestion={question => setDraft({ ...draft, question })}
              onAnswer={answer => setDraft({ ...draft, answer })}
              onSubmit={save}
              onCancel={() => setDraft(null)}
            />
          )}
        </StickyActionBar>

        {confirmDialog}
      </div>
    </>
  );
}
