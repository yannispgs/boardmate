export * from "./types";

import { createClient } from "@/lib/supabase/client";
import { createPlayerRepository } from "@/lib/supabase/repositories/players";
import type { PlayerRepository } from "./types";

/**
 * Composition root: wires repository interfaces to the active vendor adapter.
 * The browser-backed singletons live here so the rest of the app depends only
 * on the interfaces, never on Supabase. Client-side only (uses the browser
 * client). More repositories will be added as their adapters land.
 */
let playerRepository: PlayerRepository | null = null;

export function getPlayerRepository(): PlayerRepository {
  if (!playerRepository) {
    playerRepository = createPlayerRepository(createClient());
  }
  return playerRepository;
}
