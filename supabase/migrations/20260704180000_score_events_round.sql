-- Record the tour (round) each live score change happened in, so the evolution
-- chart can place every jump on its tour — making long flat plateaus (several
-- tours without scoring) visible. Backfilled to 1 for any pre-existing rows.
alter table public.score_events
  add column round int not null default 1;
