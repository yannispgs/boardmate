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

-- Catan: the rulebook has no real tie-break — reaching the target on your own
-- turn is what wins, so the player holding the turn takes it.
update public.boardgames
set scoring = scoring || jsonb_build_object('tieBreak', '[
    {
      "key": "currentTurn",
      "label": "Celui dont c''est le tour",
      "source": "currentTurn"
    }
  ]'::jsonb)
where name = 'Catan' and scoring is not null;

-- Cascadia: most nature tokens left.
update public.boardgames
set scoring = scoring || jsonb_build_object('tieBreak', '[
    {
      "key": "natureTokens",
      "label": "Le plus de jetons nature",
      "source": "ask",
      "help": "Jetons nature restants en fin de partie"
    }
  ]'::jsonb)
where name = 'Cascadia' and scoring is not null;

-- Wingspan: most unused food tokens left in the personal supply.
update public.boardgames
set scoring = scoring || jsonb_build_object('tieBreak', '[
    {
      "key": "foodTokens",
      "label": "Le plus de jetons nourriture inutilisés",
      "source": "ask",
      "help": "Nourriture restant dans la réserve personnelle"
    }
  ]'::jsonb)
where name = 'Wingspan' and scoring is not null;

-- Splito: fewest Splito cards across the player's two piles.
update public.boardgames
set scoring = scoring || jsonb_build_object('tieBreak', '[
    {
      "key": "splitoCards",
      "label": "Le moins de cartes Splito",
      "direction": "lowest",
      "source": "ask",
      "help": "Total des cartes Splito des deux piles"
    }
  ]'::jsonb)
where name = 'Splito' and scoring is not null;

-- Forêt Mixte has no tie-break rule at all: an ex æquo is a shared victory.
-- Nothing to author — the empty list is the absence of the key.
