-- "Le Nouveau Monde" is the first Marins scenario the board generator can draw
-- end to end: it has no printed map (the players lay the frame out themselves),
-- so its islands, sea and harbours are tirés au sort rather than transcribed.
-- The other scenarios wait on their rulebook map diagram.
insert into public.extension_scenarios
  (extension_id, name, target_score, board_key, sort_order)
select id, 'Le Nouveau Monde', 12, 'new-world', 2
from public.extensions
where name = 'Catan - Marins';
