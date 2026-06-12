"use client";

import { useActionState, useState } from "react";

import {
  type SignInState,
  signInWithEmail,
  verifyCode,
} from "@/lib/auth/actions";

const inputClass =
  "rounded-lg border border-black/15 bg-white px-3 py-2 text-base outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";
const buttonClass =
  "rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [sendState, sendAction, sending] = useActionState<
    SignInState,
    FormData
  >(signInWithEmail, {});
  // Lets the user go back to the email step ("wrong address / resend").
  const [restart, setRestart] = useState(false);

  if (sendState.sent && sendState.email && !restart) {
    return <CodeForm email={sendState.email} onBack={() => setRestart(true)} />;
  }

  const error = sendState.error ?? initialError;

  return (
    <form action={sendAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Adresse e-mail
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="toi@exemple.com"
          defaultValue={sendState.email}
          className={inputClass}
        />
      </label>

      <button type="submit" disabled={sending} className={buttonClass}>
        {sending ? "Envoi…" : "Recevoir un code"}
      </button>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function CodeForm({ email, onBack }: { email: string; onBack: () => void }) {
  const [state, action, verifying] = useActionState(verifyCode, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-1 text-center">
        <span aria-hidden className="text-4xl">
          🔢
        </span>
        <p className="font-medium">Entre ton code</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          On a envoyé un code à 6 chiffres à <strong>{email}</strong>.
        </p>
      </div>

      <input type="hidden" name="email" value={email} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Code de connexion
        <input
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          placeholder="123456"
          className={`${inputClass} text-center text-2xl tracking-[0.4em]`}
        />
      </label>

      <button type="submit" disabled={verifying} className={buttonClass}>
        {verifying ? "Vérification…" : "Se connecter"}
      </button>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onBack}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        Changer d&apos;adresse ou renvoyer un code
      </button>
    </form>
  );
}
