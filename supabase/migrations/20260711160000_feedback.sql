-- "Retours": a simple idea box. Authenticated users can add improvement ideas
-- and browse them; there's no per-user ownership (it's a shared, private app).
create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  message    text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Same access model as the rest: authenticated read + insert, anon denied by
-- RLS (no anon policy) even though the grant is permissive.
alter table public.feedback enable row level security;

create policy feedback_authenticated_read on public.feedback
  for select to authenticated using (true);
create policy feedback_authenticated_insert on public.feedback
  for insert to authenticated with check (true);

grant select, insert on public.feedback to anon, authenticated;
