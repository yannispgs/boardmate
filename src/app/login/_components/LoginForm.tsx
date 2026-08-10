"use client";

import { useActionState, useEffect, useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import {
  type SignInState,
  signInWithEmail,
  verifyCode,
} from "@/lib/auth/actions";

const inputClass =
  "rounded-lg border border-black/15 bg-white px-3 py-2 text-base outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";
const buttonClass =
  "rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60";

export function LoginForm({
  initialError,
}: Readonly<{ initialError?: string }>) {
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

      <ErrorText message={error} />
    </form>
  );
}

// A new code invalidates the previous one, and emails can take a few minutes
// to arrive — so the resend button is rate-limited client-side to 60s to stop
// users from invalidating an in-flight code and restarting the wait.
const RESEND_COOLDOWN_S = 60;

/** Label of the "resend the code" button, across its three states. */
function resendLabel(resending: boolean, cooldown: number): string {
  if (resending) {
    return "Envoi…";
  }

  if (cooldown > 0) {
    return `Renvoyer le code (${cooldown}s)`;
  }

  return "Renvoyer le code";
}

function CodeForm({
  email,
  onBack,
}: Readonly<{ email: string; onBack: () => void }>) {
  const [verifyState, verifyAction, verifying] = useActionState(verifyCode, {});
  const [resendState, resendAction, resending] = useActionState<
    SignInState,
    FormData
  >(signInWithEmail, {});
  // A code was just sent when we landed here, so start the cooldown immediately.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const id = setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-1 text-center">
        <span aria-hidden className="text-4xl">
          🔢
        </span>
        <p className="font-medium">Entre ton code</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          On a envoyé un code à <strong>{email}</strong>.
        </p>
      </div>

      <form action={verifyAction} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Code de connexion
          <input
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            required
            placeholder="12345678"
            className={`${inputClass} text-center text-2xl tracking-[0.4em]`}
          />
        </label>
        <button type="submit" disabled={verifying} className={buttonClass}>
          {verifying ? "Vérification…" : "Se connecter"}
        </button>
        <ErrorText message={verifyState.error} />
      </form>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Le code peut mettre quelques minutes à arriver.
      </p>

      <div className="flex flex-col items-center gap-2 text-sm">
        {/* Start the cooldown from inside the form action, not the button's
            onClick: setting state in onClick disables the submit button before
            React dispatches the (transition-based) action, which cancels the
            submission entirely — so the resend never fired. */}
        <form
          action={formData => {
            setCooldown(RESEND_COOLDOWN_S);
            resendAction(formData);
          }}
        >
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={cooldown > 0 || resending}
            className="text-zinc-500 hover:text-zinc-800 disabled:opacity-60 dark:hover:text-zinc-200"
          >
            {resendLabel(resending, cooldown)}
          </button>
        </form>
        <ErrorText message={resendState.error} />

        <button
          type="button"
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Changer d&apos;adresse
        </button>
      </div>
    </div>
  );
}
