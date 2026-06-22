-- Enable Supabase Realtime for the boardgames table so client lists update
-- live across devices. RLS still applies: only authenticated subscribers
-- receive change events. Additive and safe to run once.
alter publication supabase_realtime add table public.boardgames;
