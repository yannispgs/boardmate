-- Catan's « Maître du port » bonus makes the game one point longer: with it in
-- play the score to reach is 11, not 10. Options declare that as a
-- `targetModifier` on their config field, so the app composes the win target
-- from the game's own options the same way it does from its extensions.
update public.config_templates
set fields = (
  select jsonb_agg(
    case
      when field ->> 'key' = 'harborMaster'
        then field || '{"targetModifier": 1}'::jsonb
      else field
    end
    order by ord
  )
  from jsonb_array_elements(fields) with ordinality as t (field, ord)
)
where boardgame_id = '78047bc0-5293-4787-be48-ba7339d48c2d';
