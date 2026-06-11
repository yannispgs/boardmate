"use client";

import { useActionState } from "react";

import { type SignInState, signInWithEmail } from "@/lib/auth/actions";

const initialState: SignInState = {};

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, pending] = useActionState(
    signInWithEmail,
    initialState,
  );
  const error = state.error ?? initialError;

  if (state.sent) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <span aria-hidden className="text-4xl">
          📬
        </span>
        <p className="font-medium">Vérifie ta boîte mail</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          On t&apos;a envoyé un lien de connexion. Clique dessus pour entrer.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Adresse e-mail
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="toi@exemple.com"
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-base outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Recevoir un lien de connexion"}
      </button>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
