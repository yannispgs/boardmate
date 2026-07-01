import { headers } from "next/headers";

import { formatRetryDelay } from "@/lib/auth/retry-delay";
import { createClient } from "@/lib/supabase/server";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds to wait before retrying, when not allowed. */
  retryAfterS: number;
}

/**
 * Derives a per-client key from the request IP. Vercel/proxies set
 * `x-forwarded-for`; locally it may be absent, in which case all callers share
 * one bucket (acceptable for dev).
 */
async function clientKey(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local";
  return `auth:${ip}`;
}

/**
 * Enforces the app-level auth rate limit for the current request (see the
 * `check_auth_rate_limit` migration: >5 req/min → escalating block). Fails
 * open if the limiter errors — Supabase's own coarse limits remain the backstop
 * — so a limiter glitch never locks legitimate users out.
 */
async function enforceAuthRateLimit(): Promise<RateLimitResult> {
  // Production only. Previews/local stay unthrottled (easier to test, and
  // previews aren't the public surface). VERCEL_ENV is "production" only on the
  // prod deployment.
  if (process.env.VERCEL_ENV !== "production") {
    return { allowed: true, retryAfterS: 0 };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("check_auth_rate_limit", {
      p_key: await clientKey(),
    });
    if (error) {
      return { allowed: true, retryAfterS: 0 };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      allowed: row?.allowed ?? true,
      retryAfterS: row?.retry_after_s ?? 0,
    };
  } catch {
    return { allowed: true, retryAfterS: 0 };
  }
}

/**
 * Enforces the auth rate limit and, when the caller is throttled, returns the
 * user-facing error message (with the retry delay); otherwise `null`. Lets the
 * auth actions guard themselves with a single call instead of repeating the
 * check + message.
 */
export async function authRateLimitError(): Promise<string | null> {
  const limit = await enforceAuthRateLimit();
  if (limit.allowed) {
    return null;
  }
  return `Trop de tentatives. Réessaie dans ${formatRetryDelay(limit.retryAfterS)}.`;
}
