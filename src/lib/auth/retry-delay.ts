/**
 * Formats an auth-throttle retry delay as a short French string, e.g. "5 min"
 * or "45 s". Kept as its own pure module (no Next/Supabase imports) so it is
 * unit-testable in isolation — the rest of `rate-limit.ts` is request-scoped
 * glue exercised via e2e.
 */
export function formatRetryDelay(seconds: number): string {
  if (seconds >= 60) {
    const min = Math.ceil(seconds / 60);

    return `${min} min`;
  }

  return `${Math.max(1, seconds)} s`;
}
