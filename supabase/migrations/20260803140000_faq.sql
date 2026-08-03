-- FAQ: the questions that come up at the table, and their answers.
--
-- One table for three scopes, because the point is to search across them at
-- once ("est-ce qu'on peut… ?" without first knowing which rulebook holds the
-- answer):
--   * boardgame_id set  → a question about that game;
--   * extension_id set  → a question about that extension, shown in a played
--                         game only when the extension is active on it;
--   * both null         → a question about Boardmate itself.
-- The check keeps a row from claiming two scopes at once.
--
-- Both foreign keys cascade: a FAQ has no meaning once the game or extension it
-- answers for is gone (unlike a played game, which is history worth keeping).

create table public.faq_entries (
  id           uuid primary key default gen_random_uuid(),
  boardgame_id uuid references public.boardgames (id) on delete cascade,
  extension_id uuid references public.extensions (id) on delete cascade,
  question     text not null check (char_length(question) between 1 and 300),
  answer       text not null check (char_length(answer) between 1 and 4000),
  -- The order the questions are read in, decided by hand: the ones asked every
  -- game belong at the top, not the ones typed first.
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  constraint faq_entries_single_scope
    check (num_nonnulls(boardgame_id, extension_id) <= 1)
);

create index faq_entries_boardgame_idx
  on public.faq_entries (boardgame_id);
create index faq_entries_extension_idx
  on public.faq_entries (extension_id);

-- Same access model as the rest: authenticated read/write, anon denied by RLS
-- (no anon policy) even though the grant is permissive.
alter table public.faq_entries enable row level security;

create policy faq_entries_read on public.faq_entries
  for select to authenticated using (true);
create policy faq_entries_insert on public.faq_entries
  for insert to authenticated with check (true);
create policy faq_entries_update on public.faq_entries
  for update to authenticated using (true) with check (true);
create policy faq_entries_delete on public.faq_entries
  for delete to authenticated using (true);

grant select, insert, update, delete on public.faq_entries
  to anon, authenticated;
