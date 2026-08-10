"use server";

import { redirect } from "next/navigation";

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
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    return {
      error: "Envoi impossible pour le moment. Réessaie dans un instant.",
      email,
    };
  }
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
