-- Cascadia's "Animaux" subsection gets its own detail tab in the stats charts.
--
-- The flag already exists on dev and prod, where it was applied by hand when the
-- per-game distribution charts shipped. It was never written down as a
-- migration, so a database rebuilt from this folder — which is what the local
-- stack and CI do — never had it: the "Globale / Animaux" toggle simply did not
-- render there, and the e2e journey that checks it could not pass.
--
-- Setting it here makes every environment agree and costs dev and prod nothing:
-- they already hold this exact value, so the statement is a no-op for them.
--
-- The sheet is an ordered array (the score sheet's own column order), so it is
-- rebuilt in place with `ordinality` rather than re-aggregated in whatever
-- order the rows come back.
update public.boardgames
set scoring = jsonb_set(
  scoring,
  '{sheet}',
  (
    select jsonb_agg(
      case
        when item->>'label' = 'Animaux' then item || '{"showDetail": true}'::jsonb
        else item
      end
      order by position
    )
    from jsonb_array_elements(scoring->'sheet')
      with ordinality as sheet_item(item, position)
  )
)
where name = 'Cascadia'
  and scoring->'sheet' @> '[{"label": "Animaux"}]'::jsonb;
