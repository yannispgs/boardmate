"use client";

import type { FormEvent } from "react";

import { ErrorText } from "@/components/ErrorText";

/** Mirrors the database's own limits, so a refusal is caught before the trip. */
const MAX_QUESTION = 300;
const MAX_ANSWER = 4000;

/**
 * Writing a question and its answer, whether it is a new one or one being
 * reworded. Markup only — which section it lands in, and what happens once it is
 * saved, belong to the screen.
 */
export function FaqEntryForm({
  scopeLabel,
  question,
  answer,
  editing,
  error,
  submitting,
  onQuestion,
  onAnswer,
  onSubmit,
  onCancel,
}: Readonly<{
  /** The section being written into, so the form says where it will land. */
  scopeLabel: string;
  question: string;
  answer: string;
  editing: boolean;
  error: string | null;
  submitting: boolean;
  onQuestion: (value: string) => void;
  onAnswer: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}>) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  const incomplete = question.trim() === "" || answer.trim() === "";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10"
    >
      <h2 className="text-sm font-semibold">
        {editing ? "Modifier la question" : `Nouvelle question · ${scopeLabel}`}
      </h2>

      <input
        value={question}
        onChange={e => onQuestion(e.target.value)}
        placeholder="La question qu'on se pose"
        aria-label="Question"
        maxLength={MAX_QUESTION}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
      />

      <textarea
        value={answer}
        onChange={e => onAnswer(e.target.value)}
        placeholder="La réponse, telle qu'on la relit à table"
        aria-label="Réponse"
        maxLength={MAX_ANSWER}
        rows={4}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
      />

      <ErrorText message={error} />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || incomplete}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {editing ? "Enregistrer" : "Ajouter"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
