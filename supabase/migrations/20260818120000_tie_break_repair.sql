-- Puts back the tie-break rules the game editor quietly ate.
--
-- The editor rebuilds `scoring` from its own fields on every save, so until
-- `preserveUneditedScoring` shipped, anything the form had no field for was
-- dropped the first time somebody re-saved a game to fix a typo. `tieBreak` is
-- authored in migrations and invisible to the form, so it was one of the
-- casualties — silently, and only noticed games later, when a tie stops being
-- settled. Found on 2026-08-18 by comparing the live data to what the seeds
-- meant, rather than to the columns they created:
--
--   Wingspan  — lost on dev AND prod, so a tie there has been handing out a
--               shared victory instead of asking for the unused food tokens.
--   Cascadia  — lost on dev.
--   Terraforming Mars — lost on dev.
--
-- The code side is already fixed; this is the data side, which no amount of
-- code could repair on its own. It repeats the rules of `20260728140000` and
-- `20260811130000` rather than pointing at them: a migration is a snapshot of
-- an intent, and re-reading a four-week-old file to know what this one restores
-- is exactly the friction that let the loss sit unnoticed.
--
-- Guarded by `not (scoring ? 'tieBreak')`, which makes it idempotent and, more
-- importantly, harmless: a game whose rules are already there — including any
-- the owner may author later — is left completely alone. Forêt Mixte is absent
-- on purpose, as it always has been: a tie there IS a shared victory, and the
-- missing key is what says so.

update public.boardgames as b
set scoring = b.scoring || jsonb_build_object('tieBreak', r.rules)
from (
  values
    ('Catan', '[{"key":"currentTurn","label":"Celui dont c''est le tour","source":"currentTurn"}]'::jsonb),
    ('Cascadia', '[{"key":"natureTokens","label":"Le plus de jetons nature","source":"ask","help":"Jetons nature restants en fin de partie"}]'::jsonb),
    ('Wingspan', '[{"key":"foodTokens","label":"Le plus de jetons nourriture inutilisés","source":"ask","help":"Nourriture restant dans la réserve personnelle"}]'::jsonb),
    ('Splito', '[{"key":"splitoCards","label":"Le moins de cartes Splito","direction":"lowest","source":"ask","help":"Total des cartes Splito des deux piles"}]'::jsonb),
    ('Terraforming Mars', '[{"key":"megacredits","label":"Le plus de M€","direction":"highest","source":"ask","help":"Les M€ restants sur le compteur de chaque joueur à égalité."}]'::jsonb)
) as r(game_name, rules)
where b.name = r.game_name
  and b.scoring is not null
  and not (b.scoring ? 'tieBreak');
