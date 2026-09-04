-- Dealing the next party becomes a setting of the game, not a rule in the code.
--
-- The owner's request (2026-09-04): « Ajouter l'option de configuration d'un
-- jeu qu'il puisse enchaîner des parties d'affilé pour pouvoir le faire depuis
-- l'application sans devoir passer par le code ».
--
-- Chaining was hard-coded to `not is_timed`, and only ever reached from the
-- end-of-game form a game scored on typed totals opens — so of the eleven games
-- only Papayoo and Duck & Cover ever offered it, and no screen could grant it
-- to a twelfth. It is a decision about the game (« one party is one short
-- deal »), which makes it a column, and the button moves to the finished
-- party's screen, which every game now ends on.
--
-- Back-filled to exactly what was offered before rather than to the old
-- expression: `not is_timed` also covers Odin, which never showed the button —
-- its manche-by-manche ending goes down another path entirely. Turning it on
-- there would be a new behaviour smuggled in as a back-fill, so Odin starts
-- off, and the editor's checkbox is one tick away if the table wants it.

alter table public.boardgames
  add column is_chainable boolean not null default false;

comment on column public.boardgames.is_chainable is
  'Whether the finished party''s screen offers to deal the next one — same '
  'players, same seats, same config, in the same session. For the games a '
  'party of which is one short deal (Papayoo, Duck & Cover): walking back '
  'through the new-game funnel between two of them takes longer than the deal '
  'itself. Off by default: anything longer is worth going back through the '
  'funnel for, if only to change the seats.';

update public.boardgames
set is_chainable = true
where is_timed = false
  and coalesce(stages ->> 'advance', '') <> 'manual';
