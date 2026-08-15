"use server";

import { redirect } from "next/navigation";

import { isUnknownAddress } from "@/lib/auth/otp-error";
import { authRateLimitError } from "@/lib/auth/rate-limit";
import { createClient } from "@/lib/supabase/server";

/** Result of requesting a login code, surfaced back to the login form. */
export interface SignInState {
  error?: string;
  sent?: boolean;
  /** Echoed back so step 2 knows which address to verify. */
  email?: string;
}

/** Result of verifying a login code. */
export interface VerifyState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * The text value of a form field. `FormData.get` can also return a `File` (any
 * client can post one under any name); anything but a string is treated as
 * absent rather than stringified into "[object File]".
 */
function textField(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

/**
 * Sends a 6-digit login code by email (Supabase email OTP). This is the same
 * OTP that backs magic links — we just verify the code in-app instead of
 * following a link, which is friendlier and avoids cross-domain redirect
 * configuration.
 *
 * It only ever mails an address that already has an account, and answers the
 * same thing either way — the two comments below say why.
 */
export async function signInWithEmail(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = textField(formData, "email").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { error: "Renseigne une adresse e-mail valide." };
  }

  const rateLimited = await authRateLimitError();
  if (rateLimited) {
    return { error: rateLimited, email };
  }

  const supabase = await createClient();
  // `shouldCreateUser: false` — without it, a code request *creates* the
  // account it is for: anybody could fill `auth.users` from the login form,
  // one POST at a time, and the accounts screen would list every one of them.
  // Who may sign in is decided in the database, never from this page.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error && !isUnknownAddress(error)) {
    return {
      error: "Envoi impossible pour le moment. Réessaie dans un instant.",
      email,
    };
  }

  // An address nobody authorised gets the same screen as one that was: it is
  // simply a screen where no code will ever arrive. See `isUnknownAddress`.
  return { sent: true, email };
}

/**
 * Verifies the emailed code and establishes the session (cookies are set by the
 * server client), then redirects home.
 */
export async function verifyCode(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const email = textField(formData, "email").trim().toLowerCase();
  const token = textField(formData, "token").replace(/\D/g, "");

  if (!EMAIL_RE.test(email)) {
    return { error: "Adresse e-mail manquante. Recommence." };
  }
  // Supabase OTP length is configurable (6–10 digits); don't hard-code it —
  // just sanity-check the range and let verifyOtp be the real validator.
  if (token.length < 6 || token.length > 10) {
    return { error: "Code invalide. Vérifie l'e-mail reçu." };
  }

  const rateLimited = await authRateLimitError();
  if (rateLimited) {
    return { error: rateLimited };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: "Code invalide ou expiré. Redemande un code." };
  }

  // redirect() throws NEXT_REDIRECT — must stay outside any try/catch.
  redirect("/");
}

/** Signs out and returns to the login page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
