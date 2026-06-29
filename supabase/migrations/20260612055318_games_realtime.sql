-- Enable Supabase Realtime for the games table so the games list updates live
-- across devices (the live timer itself stays mono-device / client-side in v1;
-- this is only for cross-device list refresh). RLS still applies. Additive.
alter publication supabase_realtime add table public.games;
