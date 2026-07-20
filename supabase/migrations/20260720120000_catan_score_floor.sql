-- Catan: every player starts at 2 points and can never drop below 2 (their
-- starting settlements). Seed the scoring `startScore` / `minScore` so live
-- games initialise all players at 2 and the −/+ control floors there — no game
-- can end with an unscored player. (Cities & Knights starts at 3; that will be
-- applied later through the extension, not here.)
update public.boardgames
set scoring = scoring || jsonb_build_object('startScore', 2, 'minScore', 2)
where name = 'Catan' and scoring is not null;
