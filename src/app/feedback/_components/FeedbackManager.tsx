"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import type { Feedback } from "@/lib/domain";
import { useFeedback } from "@/lib/hooks/use-feedback";

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function FeedbackItem({ item }: { item: Feedback }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      <p className="whitespace-pre-wrap text-sm">{item.message}</p>
      <span className="text-xs text-zinc-400">
        {dateFmt.format(new Date(item.createdAt))}
      </span>
    </li>
  );
}

/** The "Retours" idea box: a form to add an idea, then the list of ideas. */
export function FeedbackManager() {
  const { items, loading, error, submit } = useFeedback();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length === 0 || busy) {
      return;
    }

    setBusy(true);
    setSendError(null);
    try {
      await submit({ message: trimmed });
      setMessage("");
      setSent(true);
    } catch {
      setSendError("Impossible d'envoyer le retour.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={message}
          onChange={e => {
            setMessage(e.target.value);
            setSent(false);
          }}
          rows={4}
          maxLength={2000}
          placeholder="Une idée, un bug, une amélioration…"
          aria-label="Votre retour"
          className="w-full resize-y rounded-xl border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
        />
        <ErrorText message={sendError} />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || message.trim().length === 0}
            className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            Envoyer
          </button>
          {sent ? (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Merci, c&apos;est noté !
            </span>
          ) : null}
        </div>
      </form>

      <ErrorText message={error} />

      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucun retour pour l&apos;instant.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map(item => (
            <FeedbackItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
