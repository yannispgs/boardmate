/**
 * What a refused code request looks like, structurally. The SDK's own error
 * type stays in `src/lib/supabase`: this file reads two fields and decides one
 * thing, so it is worth keeping unit-testable on its own.
 */
export interface OtpFailure {
  message: string;
  /** GoTrue's stable error code; older servers only say it in words. */
  code?: string | null;
}

/**
 * The codes GoTrue answers with when the address is simply not one it knows.
 * A code request that may not create an account is refused as a « signup » —
 * which is exactly what it would otherwise have been.
 */
const UNKNOWN_CODES = new Set(["otp_disabled", "signup_disabled"]);

/** Same refusal, from a server that predates the `code` field. */
const UNKNOWN_MESSAGE = /signups?\s+not\s+allowed/i;

/**
 * Does this failure only mean « no account here goes by that address »?
 *
 * Told apart from a real breakdown — mailer down, database unreachable —
 * because the two deserve opposite answers. An unknown address must get the
 * very same « code envoyé » screen as a known one: any difference at all turns
 * the login form into a way of asking whether a given person has an account
 * here (OWASP A07). A breakdown must be admitted, or somebody sits waiting for
 * a mail that was never going to come.
 */
export function isUnknownAddress(failure: OtpFailure): boolean {
  if (failure.code != null && UNKNOWN_CODES.has(failure.code)) {
    return true;
  }

  return UNKNOWN_MESSAGE.test(failure.message);
}
