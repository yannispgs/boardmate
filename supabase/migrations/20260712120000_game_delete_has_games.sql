-- Abandoning (deleting) a game must keep boardgames.has_games accurate — the
-- existing trigger only fired on insert, so a boardgame stayed "has games" even
-- after its last game was removed. Recompute it after a delete.
create or replace function public.unmark_boardgame_has_games()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
as $$
begin
  update public.boardgames b
    set has_games = exists (
      select 1 from public.games g where g.boardgame_id = old.boardgame_id
    )
    where b.id = old.boardgame_id;
  return old;
end;
$$;

drop trigger if exists games_unmark_boardgame_has_games on public.games;
create trigger games_unmark_boardgame_has_games
  after delete on public.games
  for each row
  execute function public.unmark_boardgame_has_games();
