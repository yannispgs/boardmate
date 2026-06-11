"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Result of a magic-link request, surfaced back to the login form. */
export interface SignInState {
  error?: string;
  sent?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Best-effort request origin, for the magic-link redirect target. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Sends a magic link (email OTP). On success the user receives a link to
 * `/auth/callback`, which exchanges the code for a session.
 */
export async function signInWithEmail(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { error: "Renseigne une adresse e-mail valide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await requestOrigin()}/auth/callback` },
  });

  if (error) {
    return {
      error: "Envoi impossible pour le moment. Réessaie dans un instant.",
    };
  }
  return { sent: true };
}

/** Signs out and returns to the login page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
