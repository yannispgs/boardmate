"use client";

import type { FormEvent } from "react";
import { ErrorText } from "@/components/ErrorText";

/**
 * The creation form itself — markup only. What a typed name means, and when the
 * form opens or closes, belongs to {@link useNewPlayer}.
 */
export function NewPlayerForm({
  name,
  error,
  submitting,
  onName,
  onSubmit,
  onCancel,
}: Readonly<{
  name: string;
  /** What is wrong with the name typed so far, or `null`. */
  error: string | null;
  submitting: boolean;
  onName: (name: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}>) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10"
    >
      <h2 className="text-sm font-semibold">Nouveau joueur</h2>
      <input
        value={name}
        onChange={e => onName(e.target.value)}
        placeholder="Nom du joueur"
        aria-label="Nom du joueur"
        aria-invalid={error ? true : undefined}
        maxLength={20}
        className={`rounded-lg border bg-white px-3 py-2 outline-none dark:bg-zinc-900 ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-black/15 focus:border-indigo-500 dark:border-white/15"
        }`}
      />
      <ErrorText message={error} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || name.trim() === ""}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Ajouter
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
