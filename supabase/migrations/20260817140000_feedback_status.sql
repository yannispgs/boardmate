-- Where a retour stands, shown on the Retours page.
--
-- Until now the answer lived nowhere the app could see: an idea was filed, and
-- whether it had been read, accepted, refused or was already being written was
-- only knowable by asking. The column says it.
--
-- Five stages, and no "livré": a retour is deleted once its PR reaches
-- production (the standing purge rule), so "shipped" would be a state nothing
-- ever sits in. What remains on the page is therefore exactly what is still
-- owed — plus the refusals, which are kept on purpose: a refused idea that
-- disappears is an idea somebody files again.
--
--   new          filed, not triaged yet — the default every submission gets
--   accepted     agreed to, not started
--   refused      will not be done
--   development  being written, a PR is open
--   approval     the PR is finished and waiting to be reviewed and merged
--
-- ⚠️ Still NO update policy on this table, on purpose. `20260813130000` states
-- the rule — "a retour is what somebody thought at the time; it is never
-- rewritten" — and it holds: the stage is set out of band (management API,
-- during the daily review), never from the app, which only ever displays it.
-- So there is no `feedback.update` / `feedback.triage` permission either, and
-- an authenticated session still cannot alter a single row.
alter table public.feedback
  add column status text not null default 'new'
    check (status in ('new', 'accepted', 'refused', 'development', 'approval'));

comment on column public.feedback.status is
  'Where the retour stands: new (not triaged), accepted (agreed, not started), '
  'refused, development (a PR is open), approval (the PR awaits review). There '
  'is no "shipped" — a retour is deleted once its PR is in production. Set out '
  'of band during the review; the app displays it read-only.';
