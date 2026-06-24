-- App-level rate limiting for the authentication endpoints (send code / verify
-- code). Complements Supabase's coarse built-in auth limits (per-hour) with a
-- strict per-minute burst limit and an escalating block:
--   > 5 requests in 60s  -> block 5 min
--   each further offence -> block doubles (10, 20, 40 min …), capped at 24h.
--
-- State lives in a table keyed by client (IP). It is reached ONLY through the
-- SECURITY DEFINER function below (and the service role) — never touched
-- directly by anon/authenticated, so RLS denies all direct access.

create table public.auth_rate_limits (
  key           text primary key,
  window_start  timestamptz not null default now(),
  count         int not null default 0,
  violations    int not null default 0,
  blocked_until timestamptz,
  updated_at    timestamptz not null default now()
);

alter table public.auth_rate_limits enable row level security;
-- No policies on purpose: only the SECURITY DEFINER function (and service role)
-- may touch this table. Revoke the default privileges the local stack grants.
revoke all on table public.auth_rate_limits from anon, authenticated;

/**
 * Records one request for `p_key` and returns whether it may proceed.
 *
 * Sliding fixed window: up to `p_max` requests per `p_window_s`. The
 * (`p_max` + 1)-th request within the window triggers a block of
 * `p_base_block_s`, doubling on each subsequent offence (exponential backoff),
 * capped at `p_max_block_s`. Atomic per key (the upsert locks the row).
 */
create or replace function public.check_auth_rate_limit(
  p_key text,
  p_max int default 5,
  p_window_s int default 60,
  p_base_block_s int default 300,
  p_max_block_s int default 86400
)
returns table (allowed boolean, retry_after_s int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.auth_rate_limits%rowtype;
  now_ts timestamptz := now();
  block_s bigint;
begin
  -- Upsert + lock the row for this key (atomic against concurrent requests).
  insert into public.auth_rate_limits (key)
    values (p_key)
    on conflict (key) do update set updated_at = now()
    returning * into r;

  -- Still inside an active block: refuse and report the remaining time.
  if r.blocked_until is not null and now_ts < r.blocked_until then
    return query
      select false, ceil(extract(epoch from (r.blocked_until - now_ts)))::int;
    return;
  end if;

  -- Start a fresh window when the previous one elapsed or a block just expired.
  if r.blocked_until is not null and now_ts >= r.blocked_until then
    r.count := 0;
    r.window_start := now_ts;
    r.blocked_until := null;
  elsif now_ts - r.window_start > make_interval(secs => p_window_s) then
    r.count := 0;
    r.window_start := now_ts;
  end if;

  r.count := r.count + 1;

  if r.count > p_max then
    -- Over the limit: escalate. violations grows monotonically (intentional —
    -- repeat offenders wait progressively longer). Exponent capped to avoid
    -- overflow; the block is capped at p_max_block_s.
    r.violations := r.violations + 1;
    block_s := least(
      p_base_block_s::bigint * (2 ^ least(r.violations - 1, 20))::bigint,
      p_max_block_s::bigint
    );
    r.blocked_until := now_ts + make_interval(secs => block_s::int);
    r.count := 0;
    r.window_start := now_ts;
    update public.auth_rate_limits set
      window_start = r.window_start, count = r.count,
      violations = r.violations, blocked_until = r.blocked_until,
      updated_at = now_ts
      where key = p_key;
    return query select false, block_s::int;
    return;
  end if;

  update public.auth_rate_limits set
    window_start = r.window_start, count = r.count,
    violations = r.violations, blocked_until = r.blocked_until,
    updated_at = now_ts
    where key = p_key;
  return query select true, 0;
end;
$$;

-- Anon/authenticated may only invoke the gate, not read the table.
revoke all on function
  public.check_auth_rate_limit(text, int, int, int, int) from public;
grant execute on function
  public.check_auth_rate_limit(text, int, int, int, int) to anon, authenticated;
