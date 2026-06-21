import { describe, expect, it } from "vitest";

import { anonClient } from "./client";

// The auth rate-limit gate is a SECURITY DEFINER function callable by anon
// (the pre-auth caller). It records requests per key and blocks past the
// threshold with an escalating (exponential) backoff. We exercise the function
// directly against the local DB; the app wires it into the login actions.

type RateRow = { allowed: boolean; retry_after_s: number };

const uniqueKey = () =>
  `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function hit(
  key: string,
  opts?: { p_max?: number; p_base_block_s?: number },
): Promise<RateRow> {
  const { data, error } = await anonClient().rpc("check_auth_rate_limit", {
    p_key: key,
    ...opts,
  });
  expect(error).toBeNull();
  return (data as RateRow[])[0];
}

describe("auth rate limit", () => {
  it("allows up to 5 requests then blocks for ~5 minutes", async () => {
    const key = uniqueKey();
    for (let i = 1; i <= 5; i++) {
      const r = await hit(key);
      expect(r.allowed).toBe(true);
    }
    const sixth = await hit(key);
    expect(sixth.allowed).toBe(false);
    // Default base block is 300s; allow a little clock slack.
    expect(sixth.retry_after_s).toBeGreaterThan(290);
    expect(sixth.retry_after_s).toBeLessThanOrEqual(300);
  });

  it("keeps refusing while blocked, without re-escalating immediately", async () => {
    const key = uniqueKey();
    for (let i = 1; i <= 5; i++) await hit(key);
    const first = await hit(key); // triggers the block
    const second = await hit(key); // still blocked
    expect(first.allowed).toBe(false);
    expect(second.allowed).toBe(false);
    // The remaining time only counts down (no second escalation yet).
    expect(second.retry_after_s).toBeLessThanOrEqual(first.retry_after_s);
  });

  it("escalates the block exponentially on repeat offences", async () => {
    // Tiny window/block so the block expires fast enough to re-offend in-test.
    const key = uniqueKey();
    const opts = { p_max: 1, p_base_block_s: 1 };

    expect((await hit(key, opts)).allowed).toBe(true); // 1st in window
    const block1 = await hit(key, opts); // 2nd → blocked, ~1s
    expect(block1.allowed).toBe(false);
    expect(block1.retry_after_s).toBeLessThanOrEqual(1);

    await new Promise((r) => setTimeout(r, 1200)); // let the 1s block expire

    expect((await hit(key, opts)).allowed).toBe(true); // fresh window
    const block2 = await hit(key, opts); // 2nd offence → ~2s (1 * 2^1)
    expect(block2.allowed).toBe(false);
    expect(block2.retry_after_s).toBeGreaterThan(block1.retry_after_s);
    expect(block2.retry_after_s).toBeLessThanOrEqual(2);
  });
});
