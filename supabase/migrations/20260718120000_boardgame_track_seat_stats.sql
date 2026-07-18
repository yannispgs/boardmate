-- Whether a boardgame's stats should break results down by turn order (first /
-- middle / last to play). Off by default; on for Catan, where playing order
-- meaningfully affects the outcome.
alter table public.boardgames
  add column track_seat_stats boolean not null default false;

update public.boardgames set track_seat_stats = true where name = 'Catan';
