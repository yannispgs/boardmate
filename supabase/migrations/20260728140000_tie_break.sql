-- Ex æquo / shared victory.
--
-- A game can end with several players level on the best score. Each boardgame
-- carries its own secondary rules (`scoring.tieBreak`), applied in order until
-- one separates them; when they all run out, the victory is SHARED and every
-- co-winner gets `game_players.is_winner = true`.
--
-- What was applied — and the values it ranked on — is recorded on the game so
-- the score recap can explain the outcome afterwards.

-- Which rules were applied and who was tied. Null for a game with a single
-- outright leader (the usual case).
alter table public.games add column if not exists tie_break jsonb;

-- The rules themselves, from each game's rulebook. `source` says where the
-- value comes from: `currentTurn` = the app already knows it, `ask` = the table
-- enters one number per tied player at game end.
--
-- Catan: the rulebook has no real tie-break — reaching the target on your own
-- turn is what wins, so the player holding the turn takes it.
-- Cascadia: most nature tokens left. Wingspan: most unused food tokens.
-- Splito: FEWEST Splito cards across the player's two piles.
-- Forêt Mixte has no rule at all: an ex æquo there is a shared victory, and the
-- absence of the key is what says so.
update public.boardgames as b
set scoring = b.scoring || jsonb_build_object('tieBreak', r.rules)
from (
  values
    ('Catan', '[{"key":"currentTurn","label":"Celui dont c''est le tour","source":"currentTurn"}]'::jsonb),
    ('Cascadia', '[{"key":"natureTokens","label":"Le plus de jetons nature","source":"ask","help":"Jetons nature restants en fin de partie"}]'::jsonb),
    ('Wingspan', '[{"key":"foodTokens","label":"Le plus de jetons nourriture inutilisés","source":"ask","help":"Nourriture restant dans la réserve personnelle"}]'::jsonb),
    ('Splito', '[{"key":"splitoCards","label":"Le moins de cartes Splito","direction":"lowest","source":"ask","help":"Total des cartes Splito des deux piles"}]'::jsonb)
) as r(game_name, rules)
where b.name = r.game_name and b.scoring is not null;
